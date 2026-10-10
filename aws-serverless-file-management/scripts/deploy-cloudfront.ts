import {
  createOrGetOriginAccessControl,
  createOrGetDistribution,
  getDistribution,
} from "../src/services/cloudfront.service.js";
import { s3Client } from "../src/config/s3.js";
import { env } from "../src/config/env.js";
import { PutBucketPolicyCommand } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function deployCloudFrontCDN() {
  console.log("=============================================================");
  console.log("      AWS CLOUDFRONT CDN + S3 SETUP & DEPLOYMENT             ");
  console.log("=============================================================\n");

  const sts = new STSClient({ region: env.awsRegion });
  const caller = await sts.send(new GetCallerIdentityCommand({}));
  const accountId = caller.Account;
  console.log(`[0/4] AWS Account: ${accountId} | Region: ${env.awsRegion}`);

  // 1. Tạo hoặc lấy Origin Access Control (OAC)
  console.log("\n[1/4] Ensuring CloudFront Origin Access Control (OAC)...");
  const oacName = "s3-file-storage-oac-dev";
  const oac = await createOrGetOriginAccessControl(
    oacName,
    "OAC for Student Management System S3 storage",
  );
  console.log(`    ✓ OAC ID: ${oac.id}`);
  console.log(`    ✓ OAC Name: ${oac.name}`);

  // 2. Tạo hoặc lấy CloudFront Distribution
  console.log("\n[2/4] Ensuring CloudFront CDN Distribution for S3...");
  const dist = await createOrGetDistribution({
    bucketName: env.s3BucketName,
    bucketRegion: env.awsRegion,
    oacId: oac.id,
    comment: "CloudFront CDN for Student Management System S3 Storage",
  });
  console.log(`    ✓ Distribution ID: ${dist.distributionId}`);
  console.log(`    ✓ CDN Domain Name: ${dist.domainName}`);
  console.log(`    ✓ Status: ${dist.status}`);

  // 3. Cập nhật S3 Bucket Policy cho phép CloudFront OAC đọc dữ liệu
  console.log("\n[3/4] Updating S3 Bucket Policy for CloudFront OAC...");
  const distributionArn = `arn:aws:cloudfront::${accountId}:distribution/${dist.distributionId}`;
  const bucketPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowCloudFrontServicePrincipalReadOnly",
        Effect: "Allow",
        Principal: {
          Service: "cloudfront.amazonaws.com",
        },
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${env.s3BucketName}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceArn": distributionArn,
          },
        },
      },
    ],
  };

  await s3Client.send(
    new PutBucketPolicyCommand({
      Bucket: env.s3BucketName,
      Policy: JSON.stringify(bucketPolicy),
    }),
  );
  console.log("    ✓ S3 Bucket Policy attached successfully!");
  console.log(`    ✓ Restricted to SourceArn: ${distributionArn}`);

  // 4. Lưu biến môi trường vào .env
  console.log("\n[4/4] Updating .env configuration...");
  const envPath = resolve(process.cwd(), ".env");
  try {
    let envContent = readFileSync(envPath, "utf8");
    if (!envContent.includes("CLOUDFRONT_DOMAIN=")) {
      envContent += `\nCLOUDFRONT_DOMAIN=${dist.domainName}`;
    } else {
      envContent = envContent.replace(
        /CLOUDFRONT_DOMAIN=.*/,
        `CLOUDFRONT_DOMAIN=${dist.domainName}`,
      );
    }

    if (!envContent.includes("CLOUDFRONT_DISTRIBUTION_ID=")) {
      envContent += `\nCLOUDFRONT_DISTRIBUTION_ID=${dist.distributionId}`;
    } else {
      envContent = envContent.replace(
        /CLOUDFRONT_DISTRIBUTION_ID=.*/,
        `CLOUDFRONT_DISTRIBUTION_ID=${dist.distributionId}`,
      );
    }

    writeFileSync(envPath, envContent, "utf8");
    console.log(`    ✓ Updated .env with CLOUDFRONT_DOMAIN=${dist.domainName}`);
  } catch (err: any) {
    console.warn("    ! Could not automatically update .env:", err.message);
  }

  console.log("\n=============================================================");
  console.log("   AWS CLOUDFRONT + S3 DEPLOYMENT SUCCESSFUL!                ");
  console.log(`   CDN Base URL: https://${dist.domainName}                   `);
  console.log("=============================================================");

  return dist;
}

deployCloudFrontCDN().catch((err) => {
  console.error("CloudFront Deployment Failed:", err);
  process.exit(1);
});
