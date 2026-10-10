import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import {
  listFiles,
  uploadContent,
  getFileContent,
  deleteFile,
  getFileMetadata,
  checkFileExists,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
} from "../services/s3.service.js";
import {
  saveFileMetadata,
  getFileMetadataById,
  listAllFilesMetadata,
  deleteFileMetadata,
  updateFileStatus,
  type FileMetadataRecord,
} from "../services/dynamodb.service.js";
import {
  sendFileProcessingMessage,
  receiveQueueMessages,
  deleteQueueMessage,
  getQueueMetrics,
  sendToDeadLetterQueue,
  type FileUploadMessage,
} from "../services/sqs.service.js";
import {
  logStructured,
  recordFileUploadedMetric,
  recordFileDeletedMetric,
  recordErrorMetric,
} from "../services/cloudwatch.service.js";
import { createInvalidation } from "../services/cloudfront.service.js";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const requestId = event.requestContext.requestId;

  logStructured("INFO", "Handling HTTP request", {
    requestId,
    method,
    path,
    sourceIp: event.requestContext.http.sourceIp,
  });

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  try {
    // 0. GET /health - Service Health Check
    if (method === "GET" && (path === "/health" || path === "/")) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: "healthy",
          service: "aws-serverless-file-management",
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // 1. GET /queue/metrics - Get SQS and DLQ statistics
    if (method === "GET" && path === "/queue/metrics") {
      const metrics = await getQueueMetrics();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ metrics }),
      };
    }

    // 1b. POST /cdn/invalidate - Invalidate CloudFront CDN cache
    if (method === "POST" && path === "/cdn/invalidate") {
      const distId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
      if (!distId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: "CLOUDFRONT_DISTRIBUTION_ID is not configured",
          }),
        };
      }

      let paths: string[] = ["/*"];
      if (event.body) {
        try {
          const body = JSON.parse(
            event.isBase64Encoded
              ? Buffer.from(event.body, "base64").toString("utf8")
              : event.body,
          );
          if (Array.isArray(body.paths) && body.paths.length > 0) {
            paths = body.paths.map((p: string) =>
              p.startsWith("/") ? p : `/${p}`,
            );
          } else if (body.fileKey && typeof body.fileKey === "string") {
            const cleanKey = body.fileKey.startsWith("/")
              ? body.fileKey
              : `/${body.fileKey}`;
            paths = [cleanKey];
          }
        } catch {
          // Fall back to default ["/*"]
        }
      }

      const invalidationId = await createInvalidation(distId, paths);
      logStructured("INFO", "CloudFront cache invalidation created", {
        distributionId: distId,
        invalidationId,
        paths,
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          invalidationId,
          distributionId: distId,
          paths,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // 2. POST /queue/process - Process messages from SQS and update DynamoDB
    if (method === "POST" && path === "/queue/process") {
      const messages = await receiveQueueMessages(10, 2);
      const processed: Array<{ messageId: string; fileId: string; status: string }> = [];

      for (const msg of messages) {
        if (!msg.Body || !msg.ReceiptHandle) continue;

        try {
          const payload = JSON.parse(msg.Body) as FileUploadMessage;
          if (payload.fileId) {
            await updateFileStatus(payload.fileId, "UPLOADED");
          }
          await deleteQueueMessage(msg.ReceiptHandle);
          processed.push({
            messageId: msg.MessageId ?? "",
            fileId: payload.fileId ?? "",
            status: "SUCCESS",
          });
          logStructured("INFO", "Queue message processed successfully", {
            messageId: msg.MessageId,
            fileId: payload.fileId,
          });
        } catch (err: any) {
          logStructured("ERROR", "Failed to process queue message, routing to DLQ", {
            messageId: msg.MessageId,
            error: err.message,
          });
          await sendToDeadLetterQueue(msg.Body, err.message || "Failed processing");
          await deleteQueueMessage(msg.ReceiptHandle);
          processed.push({
            messageId: msg.MessageId ?? "",
            fileId: "",
            status: "SENT_TO_DLQ",
          });
          await recordErrorMetric("QueueProcessingFailure");
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          processedCount: processed.length,
          results: processed,
        }),
      };
    }

    // 3. GET /files - List files (DynamoDB metadata with S3 fallback)
    if (method === "GET" && path === "/files") {
      let dynamoFiles: FileMetadataRecord[] = [];
      try {
        dynamoFiles = await listAllFilesMetadata();
      } catch (err: any) {
        logStructured("WARN", "DynamoDB list files failed, falling back to S3", {
          error: err.message,
        });
      }

      if (dynamoFiles.length > 0) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ files: dynamoFiles }),
        };
      }

      const s3Files = await listFiles();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ files: s3Files }),
      };
    }

    // 4. POST /files/presigned-upload - Generate presigned URL for direct S3 upload
    if (method === "POST" && path === "/files/presigned-upload") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "Request body is required" }),
        };
      }

      const body = JSON.parse(
        event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body,
      );

      if (
        !body.fileName ||
        typeof body.fileName !== "string" ||
        !body.fileName.trim()
      ) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "fileName is required" }),
        };
      }

      const fileId = randomUUID();
      const fileName = body.fileName.trim();
      const contentType = body.contentType || "application/octet-stream";
      const expiresIn = body.expiresIn || 3600;

      const url = await getPresignedUploadUrl(fileName, contentType, expiresIn);

      try {
        await saveFileMetadata({
          id: fileId,
          fileName,
          s3Key: fileName,
          size: 0,
          contentType,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        logStructured("WARN", "Failed to save pending metadata to DynamoDB", {
          error: err.message,
        });
      }

      try {
        await sendFileProcessingMessage({
          fileId,
          fileName,
          s3Key: fileName,
          size: 0,
          contentType,
          event: "PRESIGNED_UPLOAD_INITIATED",
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        logStructured("WARN", "Failed to send presigned message to SQS", {
          error: err.message,
        });
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          uploadUrl: url,
          fileId,
          fileName,
          expiresIn,
        }),
      };
    }

    // 5. POST /files - Upload file content directly (S3 + DynamoDB + SQS + CloudWatch)
    if (method === "POST" && path === "/files") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "Request body is required" }),
        };
      }

      const data = JSON.parse(
        event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body,
      );

      if (
        typeof data.fileName !== "string" ||
        typeof data.content !== "string" ||
        !data.fileName.trim()
      ) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: "fileName and content are required",
          }),
        };
      }

      const fileId = randomUUID();
      const fileName = data.fileName.trim();
      const contentType = data.contentType || "text/plain";
      const size = Buffer.byteLength(data.content, "utf8");

      await uploadContent(fileName, data.content, contentType);

      let metadataRecord: FileMetadataRecord | null = null;
      try {
        metadataRecord = await saveFileMetadata({
          id: fileId,
          fileName,
          s3Key: fileName,
          size,
          contentType,
          status: "UPLOADED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        logStructured("WARN", "Failed to save metadata to DynamoDB", {
          error: err.message,
        });
      }

      let sqsMessageId = "";
      try {
        const sqsRes = await sendFileProcessingMessage({
          fileId,
          fileName,
          s3Key: fileName,
          size,
          contentType,
          event: "FILE_UPLOADED",
          timestamp: new Date().toISOString(),
        });
        sqsMessageId = sqsRes.messageId;
      } catch (err: any) {
        logStructured("WARN", "Failed to enqueue message to SQS", {
          error: err.message,
        });
      }

      // Publish CloudWatch Custom Metric
      try {
        await recordFileUploadedMetric(size);
      } catch (err: any) {
        logStructured("WARN", "Failed to publish CloudWatch metric", {
          error: err.message,
        });
      }

      logStructured("INFO", "File uploaded and processed", {
        fileId,
        fileName,
        size,
        contentType,
        sqsMessageId,
      });

      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: "File uploaded successfully",
          fileId,
          key: fileName,
          metadata: metadataRecord,
          sqsMessageId,
        }),
      };
    }

    // 6. GET /files/{keyOrId}/metadata - Get file metadata (DynamoDB or S3)
    const metadataMatch = path.match(/^\/files\/(.+)\/metadata$/);
    if (method === "GET" && metadataMatch && metadataMatch[1]) {
      const keyOrId = decodeURIComponent(metadataMatch[1]);

      try {
        const dynamoMeta = await getFileMetadataById(keyOrId);
        if (dynamoMeta) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ metadata: dynamoMeta }),
          };
        }
      } catch (err: any) {
        logStructured("WARN", "DynamoDB lookup failed, checking S3", {
          error: err.message,
        });
      }

      const exists = await checkFileExists(keyOrId);
      if (!exists) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "File not found" }),
        };
      }

      const metadata = await getFileMetadata(keyOrId);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ metadata }),
      };
    }

    // 7. GET /files/{key}/presigned-download - Generate presigned download URL
    const presignedDownloadMatch = path.match(
      /^\/files\/(.+)\/presigned-download$/,
    );
    if (
      method === "GET" &&
      presignedDownloadMatch &&
      presignedDownloadMatch[1]
    ) {
      const keyOrId = decodeURIComponent(presignedDownloadMatch[1]);

      let resolvedKey = keyOrId;
      try {
        const record = await getFileMetadataById(keyOrId);
        if (record) {
          resolvedKey = record.s3Key;
        }
      } catch (err) {
        // Fall back to keyOrId
      }

      const exists = await checkFileExists(resolvedKey);
      if (!exists) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "File not found" }),
        };
      }

      const url = await getPresignedDownloadUrl(resolvedKey, 3600);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          downloadUrl: url,
          key: resolvedKey,
          expiresIn: 3600,
        }),
      };
    }

    // 7b. GET /files/{keyOrId}/view - Redirect (302) to S3 presigned URL for inline viewing
    const viewMatch = path.match(/^\/files\/(.+)\/view$/);
    if (method === "GET" && viewMatch && viewMatch[1]) {
      const keyOrId = decodeURIComponent(viewMatch[1]);
      let resolvedKey = keyOrId;
      try {
        const record = await getFileMetadataById(keyOrId);
        if (record) {
          resolvedKey = record.s3Key;
        }
      } catch (err) {
        // Fall back to keyOrId
      }

      const exists = await checkFileExists(resolvedKey);
      if (!exists) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "File not found" }),
        };
      }

      let viewUrl = "";
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
      if (cloudFrontDomain) {
        viewUrl = `https://${cloudFrontDomain}/${resolvedKey}`;
      } else {
        viewUrl = await getPresignedDownloadUrl(resolvedKey, 604800);
      }

      return {
        statusCode: 302,
        headers: {
          ...CORS_HEADERS,
          Location: viewUrl,
          "Cache-Control": "public, max-age=300",
        },
        body: "",
      };
    }

    // 8. GET /files/{key} - Download file content directly
    const fileMatch = path.match(/^\/files\/(.+)$/);
    const keyOrId =
      fileMatch && fileMatch[1] ? decodeURIComponent(fileMatch[1]) : null;

    if (method === "GET" && keyOrId) {
      let resolvedKey = keyOrId;
      try {
        const record = await getFileMetadataById(keyOrId);
        if (record) {
          resolvedKey = record.s3Key;
        }
      } catch (err) {
        // Fall back to keyOrId
      }

      const file = await getFileContent(resolvedKey);

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": file.contentType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${resolvedKey}"`,
        },
        body: file.content,
      };
    }

    // 9. DELETE /files/{keyOrId} - Delete file from S3 and DynamoDB
    if (method === "DELETE" && keyOrId) {
      let resolvedKey = keyOrId;
      let recordId: string | null = null;

      try {
        const record = await getFileMetadataById(keyOrId);
        if (record) {
          resolvedKey = record.s3Key;
          recordId = record.id;
        }
      } catch (err) {
        // Continue
      }

      const exists = await checkFileExists(resolvedKey);
      if (!exists && !recordId) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "File not found" }),
        };
      }

      if (exists) {
        await deleteFile(resolvedKey);
      }

      if (recordId) {
        await deleteFileMetadata(recordId);
      } else {
        try {
          await deleteFileMetadata(keyOrId);
        } catch {
          // Ignore
        }
      }

      // Publish metric
      try {
        await recordFileDeletedMetric();
      } catch (err: any) {
        logStructured("WARN", "Failed to publish delete metric", {
          error: err.message,
        });
      }

      logStructured("INFO", "File deleted successfully", {
        fileId: recordId,
        key: resolvedKey,
      });

      // Purge CloudFront cache for deleted file
      const distId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
      if (distId) {
        try {
          await createInvalidation(distId, [`/${resolvedKey}`]);
        } catch (err: any) {
          logStructured("WARN", "Failed to invalidate CloudFront cache for deleted file", {
            error: err.message,
            key: resolvedKey,
          });
        }
      }

      return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    // 404 Not Found for any other route
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Route not found" }),
    };
  } catch (error: any) {
    logStructured("ERROR", "Lambda handler error", {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });

    try {
      await recordErrorMetric(error.name || "GeneralError");
    } catch {
      // Ignore metric publishing error in error handler
    }

    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Invalid JSON body" }),
      };
    }

    if (
      error.name === "NoSuchKey" ||
      error.name === "NotFound" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "File not found" }),
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};