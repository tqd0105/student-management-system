import "dotenv/config";

const requiredEnv = [
  "AWS_REGION",
  "S3_BUCKET_NAME",
  "DYNAMODB_TABLE_NAME",
  "SQS_QUEUE_URL",
  "SQS_DLQ_URL",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  awsRegion: process.env.AWS_REGION!,
  s3BucketName: process.env.S3_BUCKET_NAME!,
  dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME!,
  sqsQueueUrl: process.env.SQS_QUEUE_URL!,
  sqsDlqUrl: process.env.SQS_DLQ_URL!,
};