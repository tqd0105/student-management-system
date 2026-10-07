import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "../src/config/sqs.js";
import {
  sendFileProcessingMessage,
  sendToDeadLetterQueue,
  receiveQueueMessages,
  deleteQueueMessage,
  getQueueMetrics,
  type FileUploadMessage,
} from "../src/services/sqs.service.js";

const sqsMock = mockClient(sqsClient);

describe("SQS Service", () => {
  beforeEach(() => {
    sqsMock.reset();
  });

  const samplePayload: FileUploadMessage = {
    fileId: "test-file-123",
    fileName: "document.pdf",
    s3Key: "document.pdf",
    size: 2048,
    contentType: "application/pdf",
    event: "FILE_UPLOADED",
    timestamp: "2026-10-06T00:00:00.000Z",
  };

  describe("sendFileProcessingMessage", () => {
    it("should send message to the main SQS queue", async () => {
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: "msg-12345",
      });

      const result = await sendFileProcessingMessage(samplePayload);

      expect(result.messageId).toBe("msg-12345");
      expect(sqsMock.commandCalls(SendMessageCommand).length).toBe(1);
    });
  });

  describe("sendToDeadLetterQueue", () => {
    it("should send failed message to DLQ", async () => {
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: "dlq-msg-999",
      });

      const result = await sendToDeadLetterQueue(
        { badData: true },
        "Corrupted file payload",
      );

      expect(result.messageId).toBe("dlq-msg-999");
      expect(sqsMock.commandCalls(SendMessageCommand).length).toBe(1);
    });
  });

  describe("receiveQueueMessages", () => {
    it("should retrieve messages from queue", async () => {
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          {
            MessageId: "msg-1",
            ReceiptHandle: "handle-1",
            Body: JSON.stringify(samplePayload),
          },
        ],
      });

      const messages = await receiveQueueMessages(5, 1);

      expect(messages).toHaveLength(1);
      expect(messages[0]?.MessageId).toBe("msg-1");
    });

    it("should return empty array if no messages", async () => {
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: undefined,
      });

      const messages = await receiveQueueMessages();
      expect(messages).toEqual([]);
    });
  });

  describe("deleteQueueMessage", () => {
    it("should delete processed message using receipt handle", async () => {
      sqsMock.on(DeleteMessageCommand).resolves({});

      await expect(deleteQueueMessage("handle-abc")).resolves.toBeUndefined();
      expect(sqsMock.commandCalls(DeleteMessageCommand).length).toBe(1);
    });
  });

  describe("getQueueMetrics", () => {
    it("should return metrics for main queue and DLQ", async () => {
      sqsMock
        .on(GetQueueAttributesCommand)
        .resolvesOnce({
          Attributes: {
            ApproximateNumberOfMessages: "5",
            ApproximateNumberOfMessagesNotVisible: "2",
          },
        })
        .resolvesOnce({
          Attributes: {
            ApproximateNumberOfMessages: "1",
          },
        });

      const metrics = await getQueueMetrics();

      expect(metrics.approximateMessages).toBe(5);
      expect(metrics.approximateMessagesNotVisible).toBe(2);
      expect(metrics.dlqMessages).toBe(1);
    });
  });
});
