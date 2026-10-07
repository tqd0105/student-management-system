import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFile, writeFile } from "node:fs/promises";
import { s3Client } from "../config/s3.js";
import { env } from "../config/env.js";

const BUCKET_NAME = env.s3BucketName;

export async function uploadFile(
  filePath: string,
  key: string,
): Promise<void> {
  const fileContent = await readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: "application/octet-stream",
  });

  await s3Client.send(command);
}

export async function downloadFile(
  key: string,
  destination: string,
): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("File content is empty");
  }

  const fileContent = await response.Body.transformToByteArray();
  await writeFile(destination, fileContent);
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export interface S3File {
  key: string;
  size: number;
  lastModified: Date | undefined;
}

export async function listFiles(): Promise<S3File[]> {
  const command = new ListObjectsV2Command({
    Bucket: env.s3BucketName,
  });

  const response = await s3Client.send(command);

  return (response.Contents ?? [])
    .filter((object) => object.Key !== undefined)
    .map((object) => ({
      key: object.Key!,
      size: object.Size ?? 0,
      lastModified: object.LastModified,
    }));
}

export async function uploadContent(
  key: string,
  content: string,
  contentType = "text/plain",
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: env.s3BucketName,
    Key: key,
    Body: content,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

export async function getFileContent(key: string): Promise<{
  content: string;
  contentType: string;
}> {
  const command = new GetObjectCommand({
    Bucket: env.s3BucketName,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("File content is empty");
  }

  const content = await response.Body.transformToString();

  return {
    content,
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string | undefined;
  lastModified: Date | undefined;
  eTag: string | undefined;
}

export async function getFileMetadata(key: string): Promise<FileMetadata> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    key,
    size: response.ContentLength ?? 0,
    contentType: response.ContentType,
    lastModified: response.LastModified,
    eTag: response.ETag?.replace(/"/g, ""),
  };
}

export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (
      error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return false; 
    }
    throw error;
  }
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPresignedUploadUrl(
  key: string,
  contentType = "application/octet-stream",
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}