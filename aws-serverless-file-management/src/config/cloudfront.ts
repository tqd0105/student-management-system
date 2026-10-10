import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { env } from "./env.js";

// CloudFront API control plane is hosted globally in us-east-1
export const cloudFrontClient = new CloudFrontClient({
  region: "us-east-1",
});

export const CLOUDFRONT_CONFIG = {
  domain: process.env.CLOUDFRONT_DOMAIN || "",
  distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || "",
  s3BucketName: env.s3BucketName,
  s3Region: env.awsRegion,
};
