import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "../src/config/s3.js";
import {
  uploadContent,
  getFileContent,
  listFiles,
  deleteFile,
  getFileMetadata,
  checkFileExists,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
} from "../src/services/s3.service.js";

const s3Mock = mockClient(s3Client);

describe("S3 Service", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  describe("uploadContent", () => {
    it("should successfully send PutObjectCommand", async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await expect(
        uploadContent("test.txt", "Hello World", "text/plain"),
      ).resolves.toBeUndefined();

      expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(1);
    });
  });

  describe("getFileContent", () => {
    it("should retrieve and transform file content to string", async () => {
      s3Mock.on(GetObjectCommand).resolves({
        ContentType: "text/plain",
        Body: {
          transformToString: async () => "Hello World Content",
        } as any,
      });

      const result = await getFileContent("test.txt");

      expect(result.content).toBe("Hello World Content");
      expect(result.contentType).toBe("text/plain");
    });

    it("should throw error if body is empty", async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined,
      });

      await expect(getFileContent("empty.txt")).rejects.toThrow(
        "File content is empty",
      );
    });
  });

  describe("listFiles", () => {
    it("should return a list of S3 files", async () => {
      const lastModified = new Date();
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: "file1.txt", Size: 100, LastModified: lastModified },
          { Key: "file2.jpg", Size: 200, LastModified: lastModified },
        ],
      });

      const files = await listFiles();

      expect(files).toHaveLength(2);
      expect(files[0]).toEqual({
        key: "file1.txt",
        size: 100,
        lastModified,
      });
    });

    it("should return empty array if Contents is undefined", async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: undefined,
      });

      const files = await listFiles();
      expect(files).toEqual([]);
    });
  });

  describe("deleteFile", () => {
    it("should send DeleteObjectCommand", async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      await expect(deleteFile("test.txt")).resolves.toBeUndefined();
      expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
    });
  });

  describe("getFileMetadata", () => {
    it("should return file metadata using HeadObjectCommand", async () => {
      const lastModified = new Date();
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: "text/plain",
        LastModified: lastModified,
        ETag: '"1234567890abcdef"',
      });

      const metadata = await getFileMetadata("test.txt");

      expect(metadata).toEqual({
        key: "test.txt",
        size: 1024,
        contentType: "text/plain",
        lastModified,
        eTag: "1234567890abcdef",
      });
    });
  });

  describe("checkFileExists", () => {
    it("should return true when file exists", async () => {
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 50,
      });

      const exists = await checkFileExists("existing.txt");
      expect(exists).toBe(true);
    });

    it("should return false when file does not exist (404 / NotFound)", async () => {
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFound";
      (notFoundError as any).$metadata = { httpStatusCode: 404 };

      s3Mock.on(HeadObjectCommand).rejects(notFoundError);

      const exists = await checkFileExists("missing.txt");
      expect(exists).toBe(false);
    });
  });

  describe("Presigned URLs", () => {
    it("should generate a presigned download URL", async () => {
      const url = await getPresignedDownloadUrl("test.txt", 300);
      expect(typeof url).toBe("string");
      expect(url).toContain("https://");
      expect(url).toContain("aws-serverless-file-management-tqd0105-2026");
      expect(url).toContain("test.txt");
      expect(url).toContain("X-Amz-Signature");
    });

    it("should generate a presigned upload URL", async () => {
      const url = await getPresignedUploadUrl("new-file.pdf", "application/pdf", 600);
      expect(typeof url).toBe("string");
      expect(url).toContain("https://");
      expect(url).toContain("aws-serverless-file-management-tqd0105-2026");
      expect(url).toContain("new-file.pdf");
      expect(url).toContain("X-Amz-Signature");
    });
  });
});
