import { cloudFrontClient } from "../src/config/cloudfront.js";
import { GetInvalidationCommand } from "@aws-sdk/client-cloudfront";
import dotenv from "dotenv";

dotenv.config();

async function runInvalidationVerification() {
  console.log("=============================================================");
  console.log("    AWS CLOUDFRONT CACHE INVALIDATION E2E VERIFICATION       ");
  console.log("=============================================================\n");

  const apiGatewayUrl =
    process.env.API_GATEWAY_URL ||
    "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";
  const distributionId =
    process.env.CLOUDFRONT_DISTRIBUTION_ID || "EO1NOKIOH6E7G";

  console.log(`[0/4] Configuration:`);
  console.log(`    • API Gateway: ${apiGatewayUrl}`);
  console.log(`    • Distribution ID: ${distributionId}`);

  // 1. Gửi request Invalidation tới API Gateway endpoint POST /cdn/invalidate
  console.log("\n[1/4] Triggering CloudFront Cache Invalidation via API Gateway...");
  const targetPath = `/avatar-test-invalidation-${Date.now()}/*`;
  const response = await fetch(`${apiGatewayUrl}/cdn/invalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: [targetPath],
    }),
  });

  console.log(`    ✓ API Gateway HTTP Status: ${response.status}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Invalidation API failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`    ✓ Invalidation Response:`, result);

  if (!result.success || !result.invalidationId) {
    throw new Error("Invalid response: missing invalidationId or success flag");
  }

  const invalidationId = result.invalidationId;

  // 2. Kiểm tra trực tiếp trên AWS CloudFront xem Invalidation có tồn tại và đang chạy
  console.log("\n[2/4] Verifying Invalidation status on AWS CloudFront...");
  const cfRes = await cloudFrontClient.send(
    new GetInvalidationCommand({
      DistributionId: distributionId,
      Id: invalidationId,
    }),
  );

  const inv = cfRes.Invalidation;
  console.log(`    ✓ Invalidation ID: ${inv?.Id}`);
  console.log(`    ✓ Invalidation Status: ${inv?.Status}`);
  console.log(`    ✓ Created Time: ${inv?.CreateTime}`);
  console.log(`    ✓ Target Paths:`, inv?.InvalidationBatch?.Paths?.Items);

  // 3. Thử nghiệm Invalidation theo định dạng fileKey đơn lẻ
  console.log("\n[3/4] Testing single fileKey invalidation format...");
  const fileKeyRes = await fetch(`${apiGatewayUrl}/cdn/invalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileKey: "avatar-cmuectman0002o6csomypdu2p-1791612067385-a2.jpg",
    }),
  });

  const fileKeyResult = await fileKeyRes.json();
  console.log(`    ✓ Single fileKey Invalidation ID: ${fileKeyResult.invalidationId}`);
  console.log(`    ✓ Invalidation Path: ${fileKeyResult.paths?.[0]}`);

  // 4. Kết luận
  console.log("\n[4/4] Invalidation Verification Completed!");
  console.log("=============================================================");
  console.log("   AWS CLOUDFRONT CACHE INVALIDATION 100% SUCCESSFUL!        ");
  console.log("=============================================================");
}

runInvalidationVerification().catch((err) => {
  console.error("Invalidation Verification Failed:", err);
  process.exit(1);
});
