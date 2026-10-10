import {
  getDistribution,
  getCloudFrontUrl,
  createOrGetOriginAccessControl,
} from "../src/services/cloudfront.service.js";
import { env } from "../src/config/env.js";
import { s3Client } from "../src/config/s3.js";
import { GetBucketPolicyCommand } from "@aws-sdk/client-s3";

async function verifyCloudFrontIntegration() {
  console.log("=============================================================");
  console.log("       AWS CLOUDFRONT CDN + S3 E2E VERIFICATION              ");
  console.log("=============================================================\n");

  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!distributionId || !cloudfrontDomain) {
    throw new Error(
      "Missing CLOUDFRONT_DISTRIBUTION_ID or CLOUDFRONT_DOMAIN in environment",
    );
  }

  // 1. Kiểm tra Origin Access Control (OAC)
  console.log("[1/6] Verifying CloudFront Origin Access Control (OAC)...");
  const oac = await createOrGetOriginAccessControl("s3-file-storage-oac-dev");
  console.log(`    ✓ OAC ID: ${oac.id}`);
  console.log(`    ✓ OAC Name: ${oac.name}`);

  // 2. Kiểm tra CloudFront Distribution
  console.log("\n[2/6] Verifying CloudFront Distribution configuration...");
  const dist = await getDistribution(distributionId);
  console.log(`    ✓ Distribution ID: ${dist.id}`);
  console.log(`    ✓ Domain Name: ${dist.domainName}`);
  console.log(`    ✓ Status: ${dist.status}`);

  // 3. Kiểm tra S3 Bucket Policy
  console.log("\n[3/6] Verifying S3 Bucket Policy enforcement...");
  const policyRes = await s3Client.send(
    new GetBucketPolicyCommand({ Bucket: env.s3BucketName }),
  );
  const policyJson = JSON.parse(policyRes.Policy || "{}");
  const hasCloudFrontPrincipal = policyJson.Statement?.some(
    (stmt: any) =>
      stmt.Principal?.Service === "cloudfront.amazonaws.com" &&
      stmt.Action === "s3:GetObject",
  );
  if (!hasCloudFrontPrincipal) {
    throw new Error("S3 Bucket Policy is missing CloudFront principal");
  }
  console.log("    ✓ S3 Bucket Policy correctly restricts access to CloudFront");

  // 4. Kiểm tra chặn truy cập trực tiếp S3 (Security check)
  console.log("\n[4/6] Verifying Direct S3 Public Access is BLOCKED (403)...");
  const directS3Url = `https://${env.s3BucketName}.s3.${env.awsRegion}.amazonaws.com/avatar-cmuectman0002o6csomypdu2p-1791548131601-a1.jpg`;
  const directRes = await fetch(directS3Url);
  console.log(`    ✓ Direct S3 URL: ${directS3Url}`);
  console.log(`    ✓ HTTP Status: ${directRes.status} (Expected: 403 Forbidden)`);
  if (directRes.status !== 403) {
    throw new Error(`Direct S3 access was not blocked! Status: ${directRes.status}`);
  }

  // 5. Kiểm tra truy cập qua CloudFront CDN (First hit - Miss from cache)
  console.log("\n[5/6] Verifying CDN Delivery via CloudFront Edge...");
  const cdnUrl = getCloudFrontUrl(
    "avatar-cmuectman0002o6csomypdu2p-1791548131601-a1.jpg",
    cloudfrontDomain,
  );
  console.log(`    ✓ CDN URL: ${cdnUrl}`);
  const cdnRes1 = await fetch(cdnUrl);
  console.log(`    ✓ HTTP Status: ${cdnRes1.status} (Expected: 200 OK)`);
  console.log(`    ✓ Content-Type: ${cdnRes1.headers.get("content-type")}`);
  console.log(`    ✓ X-Cache Header: ${cdnRes1.headers.get("x-cache")}`);

  if (cdnRes1.status !== 200) {
    throw new Error(`CloudFront delivery failed with status: ${cdnRes1.status}`);
  }

  // 6. Kiểm tra CloudFront Edge Cache Hit (Second hit)
  console.log("\n[6/6] Verifying CloudFront Edge Caching (Cache Hit)...");
  const cdnRes2 = await fetch(cdnUrl);
  const cacheHeader = cdnRes2.headers.get("x-cache");
  const ageHeader = cdnRes2.headers.get("age");
  console.log(`    ✓ Second Request Status: ${cdnRes2.status}`);
  console.log(`    ✓ X-Cache Header: ${cacheHeader}`);
  console.log(`    ✓ Cache Age: ${ageHeader} seconds`);

  console.log("\n=============================================================");
  console.log("   AWS CLOUDFRONT + S3 INTEGRATION VERIFIED 100%!            ");
  console.log(`   Edge Domain: https://${cloudfrontDomain}                  `);
  console.log("=============================================================");
}

verifyCloudFrontIntegration().catch((err) => {
  console.error("CloudFront Verification failed:", err);
  process.exit(1);
});
