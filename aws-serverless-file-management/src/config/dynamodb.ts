import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env.js";

const rawClient = new DynamoDBClient({
  region: env.awsRegion,
});

export const dynamoDocClient = DynamoDBDocumentClient.from(rawClient, {
  // Chuyển đổi từ js object sang format dynamodb
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
