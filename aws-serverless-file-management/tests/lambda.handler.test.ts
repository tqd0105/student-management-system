import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand as SqsDeleteCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { s3Client } from "../src/config/s3.js";
import { dynamoDocClient } from "../src/config/dynamodb.js";
import { sqsClient } from "../src/config/sqs.js";
import { cloudwatchClient } from "../src/config/cloudwatch.js";
import { handler } from "../src/lambda/handler.js";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async (client: any, command: any) => {
    const bucket = (command?.input?.Bucket ?? "aws-serverless-file-management-tqd0105-2026") as string;
    const key = (command?.input?.Key ?? "test.txt") as string;
    return `https://${bucket}.s3.ap-southeast-1.amazonaws.com/${key}?X-Amz-Signature=mocked`;
  },
}));

const s3Mock = mockClient(s3Client);
const dynamoMock = mockClient(dynamoDocClient);
const sqsMock = mockClient(sqsClient);
const cwMock = mockClient(cloudwatchClient);

function createMockEvent(options: {
  method: string;
  path: string;
  body?: string;
  isBase64Encoded?: boolean;
}): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "id.execute-api.ap-southeast-1.amazonaws.com",
      domainPrefix: "id",
      http: {
        method: options.method,
        path: options.path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest-agent",
      },
      requestId: "request-id-123",
      routeKey: `${options.method} ${options.path}`,
      stage: "$default",
      time: "06/Oct/2026:06:00:00 +0000",
      timeEpoch: 1791266400000,
    },
    body: options.body,
    isBase64Encoded: options.isBase64Encoded ?? false,
  };
}

describe("Lambda Handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    dynamoMock.reset();
    sqsMock.reset();
    cwMock.reset();
    cwMock.on(PutMetricDataCommand).resolves({});

    dynamoMock.on(PutCommand).resolves({});
    dynamoMock.on(DeleteCommand).resolves({});
    dynamoMock.on(UpdateCommand).resolves({});
    dynamoMock.on(GetCommand).resolves({ Item: undefined });
    dynamoMock.on(ScanCommand).resolves({ Items: [] });

    sqsMock.on(SendMessageCommand).resolves({ MessageId: "mock-sqs-id" });
    sqsMock.on(ReceiveMessageCommand).resolves({ Messages: [] });
    sqsMock.on(SqsDeleteCommand).resolves({});
    sqsMock.on(GetQueueAttributesCommand).resolves({
      Attributes: {
        ApproximateNumberOfMessages: "0",
        ApproximateNumberOfMessagesNotVisible: "0",
      },
    });
  });

  it("should handle CORS preflight OPTIONS request", async () => {
    const event = createMockEvent({ method: "OPTIONS", path: "/files" });
    const response = await handler(event);

    expect(response.statusCode).toBe(204);
    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(response.body).toBe("");
  });

  it("should return 200 and healthy status for GET /health", async () => {
    const event = createMockEvent({ method: "GET", path: "/health" });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
    expect(body.service).toBe("aws-serverless-file-management");
    expect(body.timestamp).toBeDefined();
  });

  describe("GET /queue/metrics", () => {
    it("should return queue and DLQ metrics", async () => {
      sqsMock
        .on(GetQueueAttributesCommand)
        .resolvesOnce({
          Attributes: {
            ApproximateNumberOfMessages: "3",
            ApproximateNumberOfMessagesNotVisible: "1",
          },
        })
        .resolvesOnce({
          Attributes: {
            ApproximateNumberOfMessages: "0",
          },
        });

      const event = createMockEvent({ method: "GET", path: "/queue/metrics" });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.metrics.approximateMessages).toBe(3);
      expect(data.metrics.approximateMessagesNotVisible).toBe(1);
      expect(data.metrics.dlqMessages).toBe(0);
    });
  });

  describe("POST /queue/process", () => {
    it("should process messages from SQS and delete them", async () => {
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          {
            MessageId: "msg-1",
            ReceiptHandle: "handle-1",
            Body: JSON.stringify({
              fileId: "file-abc",
              fileName: "test.txt",
            }),
          },
        ],
      });

      const event = createMockEvent({ method: "POST", path: "/queue/process" });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.processedCount).toBe(1);
      expect(data.results[0].status).toBe("SUCCESS");
      expect(dynamoMock.commandCalls(UpdateCommand).length).toBe(1);
      expect(sqsMock.commandCalls(SqsDeleteCommand).length).toBe(1);
    });
  });

  describe("GET /files", () => {
    it("should return list of files from DynamoDB if present", async () => {
      dynamoMock.on(ScanCommand).resolves({
        Items: [
          {
            id: "uuid-123",
            fileName: "dynamo-file.txt",
            s3Key: "dynamo-file.txt",
            size: 100,
            contentType: "text/plain",
            status: "UPLOADED",
            createdAt: "2026-10-06T00:00:00.000Z",
            updatedAt: "2026-10-06T00:00:00.000Z",
          },
        ],
      });

      const event = createMockEvent({ method: "GET", path: "/files" });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.files).toHaveLength(1);
      expect(data.files[0].id).toBe("uuid-123");
      expect(data.files[0].fileName).toBe("dynamo-file.txt");
    });

    it("should fallback to S3 list if DynamoDB is empty", async () => {
      dynamoMock.on(ScanCommand).resolves({ Items: [] });
      const now = new Date();
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [{ Key: "note.txt", Size: 42, LastModified: now }],
      });

      const event = createMockEvent({ method: "GET", path: "/files" });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.files).toHaveLength(1);
      expect(data.files[0].key).toBe("note.txt");
    });
  });

  describe("POST /files", () => {
    it("should upload content directly to S3, save metadata to DynamoDB, and enqueue to SQS", async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent({
        method: "POST",
        path: "/files",
        body: JSON.stringify({
          fileName: "document.txt",
          content: "Hello Lambda",
          contentType: "text/plain",
        }),
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body as string);
      expect(data.message).toBe("File uploaded successfully");
      expect(data.key).toBe("document.txt");
      expect(typeof data.fileId).toBe("string");
      expect(data.metadata.fileName).toBe("document.txt");
      expect(data.sqsMessageId).toBe("mock-sqs-id");
      expect(dynamoMock.commandCalls(PutCommand).length).toBe(1);
      expect(sqsMock.commandCalls(SendMessageCommand).length).toBe(1);
    });

    it("should handle base64 encoded request body", async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const jsonPayload = JSON.stringify({
        fileName: "b64.txt",
        content: "Base64 Content",
      });
      const b64Body = Buffer.from(jsonPayload).toString("base64");

      const event = createMockEvent({
        method: "POST",
        path: "/files",
        body: b64Body,
        isBase64Encoded: true,
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body as string);
      expect(data.key).toBe("b64.txt");
    });

    it("should return 400 when body or fileName is missing", async () => {
      const eventNoBody = createMockEvent({ method: "POST", path: "/files" });
      const res1 = await handler(eventNoBody);
      expect(res1.statusCode).toBe(400);

      const eventEmptyBody = createMockEvent({
        method: "POST",
        path: "/files",
        body: JSON.stringify({ fileName: "" }),
      });
      const res2 = await handler(eventEmptyBody);
      expect(res2.statusCode).toBe(400);
    });
  });

  describe("POST /files/presigned-upload", () => {
    it("should return a presigned upload URL and record pending metadata", async () => {
      const event = createMockEvent({
        method: "POST",
        path: "/files/presigned-upload",
        body: JSON.stringify({
          fileName: "report.pdf",
          contentType: "application/pdf",
          expiresIn: 1800,
        }),
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.uploadUrl).toContain("https://");
      expect(data.fileName).toBe("report.pdf");
      expect(data.expiresIn).toBe(1800);
      expect(typeof data.fileId).toBe("string");
      expect(dynamoMock.commandCalls(PutCommand).length).toBe(1);
      expect(sqsMock.commandCalls(SendMessageCommand).length).toBe(1);
    });

    it("should return 400 if fileName is missing", async () => {
      const event = createMockEvent({
        method: "POST",
        path: "/files/presigned-upload",
        body: JSON.stringify({}),
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /files/{keyOrId}/metadata", () => {
    it("should return metadata from DynamoDB if found by ID", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: "uuid-456",
          fileName: "db-item.json",
          s3Key: "db-item.json",
          size: 512,
          contentType: "application/json",
          status: "UPLOADED",
          createdAt: "2026-10-06T00:00:00.000Z",
          updatedAt: "2026-10-06T00:00:00.000Z",
        },
      });

      const event = createMockEvent({
        method: "GET",
        path: "/files/uuid-456/metadata",
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.metadata.id).toBe("uuid-456");
      expect(data.metadata.fileName).toBe("db-item.json");
    });

    it("should return file metadata from S3 if not in DynamoDB but exists in S3", async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      const now = new Date();
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: "application/json",
        LastModified: now,
        ETag: '"abc"',
      });

      const event = createMockEvent({
        method: "GET",
        path: "/files/data.json/metadata",
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.metadata.key).toBe("data.json");
      expect(data.metadata.size).toBe(1024);
    });

    it("should return 404 if file does not exist in DynamoDB or S3", async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFound";
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      s3Mock.on(HeadObjectCommand).rejects(notFoundError);

      const event = createMockEvent({
        method: "GET",
        path: "/files/missing.json/metadata",
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /files/{key}/presigned-download", () => {
    it("should return presigned download url if file exists", async () => {
      s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 256 });

      const event = createMockEvent({
        method: "GET",
        path: "/files/report.pdf/presigned-download",
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body as string);
      expect(data.downloadUrl).toContain("https://");
      expect(data.key).toBe("report.pdf");
    });

    it("should return 404 if file does not exist", async () => {
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFound";
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      s3Mock.on(HeadObjectCommand).rejects(notFoundError);

      const event = createMockEvent({
        method: "GET",
        path: "/files/missing.pdf/presigned-download",
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /files/{key}", () => {
    it("should return raw file content with attachment header", async () => {
      s3Mock.on(GetObjectCommand).resolves({
        ContentType: "text/plain",
        Body: {
          transformToString: async () => "Direct Download Content",
        } as any,
      });

      const event = createMockEvent({
        method: "GET",
        path: "/files/hello.txt",
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers?.["Content-Type"]).toBe("text/plain");
      expect(response.headers?.["Content-Disposition"]).toContain("hello.txt");
      expect(response.body).toBe("Direct Download Content");
    });
  });

  describe("DELETE /files/{keyOrId}", () => {
    it("should delete existing file from S3 and DynamoDB and return 204", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: "uuid-del",
          fileName: "delete-me.txt",
          s3Key: "delete-me.txt",
        },
      });
      s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 100 });
      s3Mock.on(DeleteObjectCommand).resolves({});

      const event = createMockEvent({
        method: "DELETE",
        path: "/files/uuid-del",
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(204);
      expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
      expect(dynamoMock.commandCalls(DeleteCommand).length).toBe(1);
    });

    it("should return 404 if file does not exist", async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFound";
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      s3Mock.on(HeadObjectCommand).rejects(notFoundError);

      const event = createMockEvent({
        method: "DELETE",
        path: "/files/not-there.txt",
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Not found and error handling", () => {
    it("should return 404 for unknown route", async () => {
      const event = createMockEvent({
        method: "GET",
        path: "/unknown-route",
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body as string);
      expect(data.message).toBe("Route not found");
    });

    it("should return 400 for invalid JSON syntax in body", async () => {
      const event = createMockEvent({
        method: "POST",
        path: "/files",
        body: "{ malformed json",
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body as string);
      expect(data.message).toBe("Invalid JSON body");
    });
  });
});
