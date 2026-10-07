import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../src/config/dynamodb.js";
import {
  saveFileMetadata,
  getFileMetadataById,
  listAllFilesMetadata,
  deleteFileMetadata,
  updateFileStatus,
  type FileMetadataRecord,
} from "../src/services/dynamodb.service.js";

const dynamoMock = mockClient(dynamoDocClient);

describe("DynamoDB Service", () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  const sampleRecord: FileMetadataRecord = {
    id: "test-uuid-1",
    fileName: "sample.txt",
    s3Key: "test-uuid-1-sample.txt",
    size: 1024,
    contentType: "text/plain",
    status: "UPLOADED",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
  };

  describe("saveFileMetadata", () => {
    it("should save metadata item into DynamoDB", async () => {
      dynamoMock.on(PutCommand).resolves({});

      const result = await saveFileMetadata(sampleRecord);
      expect(result).toEqual(sampleRecord);
      expect(dynamoMock.commandCalls(PutCommand).length).toBe(1);
    });
  });

  describe("getFileMetadataById", () => {
    it("should return metadata record when found", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: sampleRecord,
      });

      const result = await getFileMetadataById("test-uuid-1");
      expect(result).toEqual(sampleRecord);
    });

    it("should return null when record does not exist", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const result = await getFileMetadataById("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("listAllFilesMetadata", () => {
    it("should return array of metadata records", async () => {
      dynamoMock.on(ScanCommand).resolves({
        Items: [sampleRecord],
      });

      const results = await listAllFilesMetadata();
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("test-uuid-1");
    });

    it("should return empty array if no items exist", async () => {
      dynamoMock.on(ScanCommand).resolves({
        Items: undefined,
      });

      const results = await listAllFilesMetadata();
      expect(results).toEqual([]);
    });
  });

  describe("deleteFileMetadata", () => {
    it("should delete record by id", async () => {
      dynamoMock.on(DeleteCommand).resolves({});

      await expect(deleteFileMetadata("test-uuid-1")).resolves.toBeUndefined();
      expect(dynamoMock.commandCalls(DeleteCommand).length).toBe(1);
    });
  });

  describe("updateFileStatus", () => {
    it("should update status in DynamoDB", async () => {
      dynamoMock.on(UpdateCommand).resolves({});

      await expect(
        updateFileStatus("test-uuid-1", "DELETED"),
      ).resolves.toBeUndefined();
      expect(dynamoMock.commandCalls(UpdateCommand).length).toBe(1);
    });
  });
});
