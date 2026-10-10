import { SSMClient } from "@aws-sdk/client-ssm";
import { env } from "./env.js";

export const ssmClient = new SSMClient({
  region: env.awsRegion,
});
