import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { env } from "./env.js";

export const cloudwatchClient = new CloudWatchClient({
  region: env.awsRegion,
});
