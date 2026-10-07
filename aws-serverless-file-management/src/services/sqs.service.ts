import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "../config/sqs.js";
import { env } from "../config/env.js";

export interface FileUploadMessage {
  fileId: string;
  fileName: string;
  s3Key: string;
  size: number;
  contentType: string;
  event: "FILE_UPLOADED" | "PRESIGNED_UPLOAD_INITIATED";
  timestamp: string;
}

export async function sendFileProcessingMessage(
  payload: FileUploadMessage,
): Promise<{ messageId: string }> {
  const result = await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: env.sqsQueueUrl,
      MessageBody: JSON.stringify(payload),
      MessageAttributes: {
        eventType: {
          DataType: "String",
          StringValue: payload.event,
        },
        fileId: {
          DataType: "String",
          StringValue: payload.fileId,
        },
      },
    }),
  );

  return { messageId: result.MessageId ?? "" };
}

export async function sendToDeadLetterQueue(
  payload: any,
  errorReason: string,
): Promise<{ messageId: string }> {
  const result = await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: env.sqsDlqUrl,
      MessageBody: JSON.stringify({
        failedPayload: payload,
        errorReason,
        failedAt: new Date().toISOString(),
      }),
    }),
  );

  return { messageId: result.MessageId ?? "" };
}

export async function receiveQueueMessages(
  maxMessages = 10,
  waitTimeSeconds = 2,
): Promise<Message[]> {
  const result = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: env.sqsQueueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      MessageAttributeNames: ["All"],
    }),
  );

  return result.Messages ?? [];
}

export async function deleteQueueMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.sqsQueueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
}

export async function getQueueMetrics(): Promise<{
  approximateMessages: number;
  approximateMessagesNotVisible: number;
  dlqMessages: number;
}> {
  const [mainAttrs, dlqAttrs] = await Promise.all([
    sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.sqsQueueUrl,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
        ],
      }),
    ),
    sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.sqsDlqUrl,
        AttributeNames: ["ApproximateNumberOfMessages"],
      }),
    ),
  ]);

  return {
    approximateMessages: parseInt(
      mainAttrs.Attributes?.ApproximateNumberOfMessages ?? "0",
      10,
    ),
    approximateMessagesNotVisible: parseInt(
      mainAttrs.Attributes?.ApproximateNumberOfMessagesNotVisible ?? "0",
      10,
    ),
    dlqMessages: parseInt(
      dlqAttrs.Attributes?.ApproximateNumberOfMessages ?? "0",
      10,
    ),
  };
}
