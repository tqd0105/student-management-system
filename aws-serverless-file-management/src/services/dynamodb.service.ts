import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { env } from "../config/env.js";

export interface FileMetadataRecord {
  id: string;
  fileName: string;
  s3Key: string;
  size: number;
  contentType: string;
  status: "UPLOADED" | "PENDING" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

export async function saveFileMetadata(
  item: FileMetadataRecord,
): Promise<FileMetadataRecord> {
  await dynamoDocClient.send(
    new PutCommand({
      TableName: env.dynamoDbTableName,
      Item: item,
    }),
  );
  return item;
}

export async function getFileMetadataById(
  id: string,
): Promise<FileMetadataRecord | null> {
  const result = await dynamoDocClient.send(
    new GetCommand({
      TableName: env.dynamoDbTableName,
      Key: { id },
    }),
  );

  return (result.Item as FileMetadataRecord) ?? null;
}

export async function listAllFilesMetadata(): Promise<FileMetadataRecord[]> {
  const result = await dynamoDocClient.send(
    new ScanCommand({
      TableName: env.dynamoDbTableName,
    }),
  );

  return (result.Items as FileMetadataRecord[]) ?? [];
}

export async function deleteFileMetadata(id: string): Promise<void> {
  await dynamoDocClient.send(
    new DeleteCommand({
      TableName: env.dynamoDbTableName,
      Key: { id },
    }),
  );
}

export async function updateFileStatus(
  id: string,
  status: FileMetadataRecord["status"],
): Promise<void> {
  await dynamoDocClient.send(
    new UpdateCommand({
      TableName: env.dynamoDbTableName,
      Key: { id },
      UpdateExpression: "SET #st = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
}
