import { SQSClient } from "@aws-sdk/client-sqs";
import { env } from "./env.js";

export const sqsClient = new SQSClient({
  region: env.awsRegion,
});
