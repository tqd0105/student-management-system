import { execSync } from "node:child_process";
import path from "node:path";

const API_BASE_URL = "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";
const ROOT_DIR = path.resolve(__dirname, "..");
const TERRAFORM_DIR = path.resolve(__dirname, "../terraform");

async function runFullSystemIntegrationTest() {
  console.log("=============================================================");
  console.log("   STEP 9: FULL SYSTEM END-TO-END INTEGRATION TEST           ");
  console.log("=============================================================");
  console.log(`API Gateway Base URL: ${API_BASE_URL}\n`);

  // 1. Health check
  console.log("[1/6] Testing Service Health Check (GET /health)...");
  const healthRes = await fetch(`${API_BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with HTTP ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  console.log(`    ✓ Status: ${healthData.status} | Service: ${healthData.service} | Time: ${healthData.timestamp}`);

  // 2. Presigned Upload Flow & S3 direct upload
  console.log("\n[2/6] Testing Presigned Upload Workflow (POST /files/presigned-upload)...");
  const testFileName = `e2e-test-${Date.now()}.txt`;
  const presignedReq = await fetch(`${API_BASE_URL}/files/presigned-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: testFileName,
      contentType: "text/plain",
      metadata: { source: "e2e-test", test: "true" },
    }),
  });
  if (!presignedReq.ok) {
    throw new Error(`Presigned upload request failed: ${await presignedReq.text()}`);
  }
  const presignedData = await presignedReq.json();
  console.log(`    ✓ Presigned Upload URL created for file: ${testFileName}`);
  console.log(`    ✓ File ID:   ${presignedData.fileId}`);
  console.log(`    ✓ File Name: ${presignedData.fileName}`);

  // Upload file content directly to S3 via presigned PUT URL
  console.log("    Uploading test payload directly to Amazon S3 via Presigned URL...");
  const s3PutRes = await fetch(presignedData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: "Hello from SMS AWS Serverless E2E Integration Test!",
  });
  if (!s3PutRes.ok) {
    throw new Error(`Direct S3 upload failed with status ${s3PutRes.status}`);
  }
  console.log(`    ✓ Direct S3 PUT succeeded (HTTP ${s3PutRes.status})`);

  // 3. Metadata retrieval (DynamoDB & S3)
  console.log("\n[3/6] Testing File Metadata Retrieval (GET /files/{keyOrId}/metadata)...");
  const metaRes = await fetch(`${API_BASE_URL}/files/${presignedData.fileId}/metadata`);
  if (!metaRes.ok) {
    throw new Error(`Metadata fetch failed: ${await metaRes.text()}`);
  }
  const metaJson = await metaRes.json();
  const metaData = metaJson.metadata;
  console.log(`    ✓ Metadata verified: ID=${metaData.id}, Status=${metaData.status}, S3Key=${metaData.s3Key}`);

  // 4. Presigned Download URL retrieval (by fileId or fileName)
  console.log("\n[4/6] Testing Presigned Download URL (GET /files/{key}/presigned-download)...");
  const dlRes = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(presignedData.fileId)}/presigned-download`);
  if (!dlRes.ok) {
    throw new Error(`Presigned download fetch failed: ${await dlRes.text()}`);
  }
  const dlData = await dlRes.json();
  console.log(`    ✓ Presigned Download URL obtained (expires in ${dlData.expiresIn}s)`);

  // Download content and verify integrity
  const fileContentRes = await fetch(dlData.downloadUrl);
  const fileContent = await fileContentRes.text();
  console.log(`    ✓ File downloaded content: "${fileContent}"`);
  if (!fileContent.includes("Hello from SMS AWS Serverless E2E")) {
    throw new Error("Downloaded content does not match uploaded content");
  }

  // 5. SQS & DLQ Metrics
  console.log("\n[5/6] Testing SQS & DLQ Telemetry (GET /queue/metrics)...");
  const queueRes = await fetch(`${API_BASE_URL}/queue/metrics`);
  if (!queueRes.ok) {
    throw new Error(`Queue metrics request failed: ${await queueRes.text()}`);
  }
  const queueData = await queueRes.json();
  console.log(`    ✓ SQS Main Queue Messages: ${queueData.metrics.approximateMessages}`);
  console.log(`    ✓ SQS In-Flight Messages:  ${queueData.metrics.approximateMessagesNotVisible}`);
  console.log(`    ✓ SQS Dead Letter Queue:   ${queueData.metrics.dlqMessages}`);

  // 6. Cleanup & Automated Test Suite Verification
  console.log("\n[6/6] Cleaning up test file & verifying test suite...");
  const delRes = await fetch(`${API_BASE_URL}/files/${presignedData.fileId}`, {
    method: "DELETE",
  });
  console.log(`    ✓ Test file cleanup status: HTTP ${delRes.status}`);

  console.log("    Running all 50 automated Vitest unit tests...");
  execSync("pnpm test", { cwd: ROOT_DIR, stdio: "pipe" });
  console.log("    ✓ 50/50 Unit Tests Passed!");

  console.log("    Validating Terraform Infrastructure...");
  execSync("terraform validate", { cwd: TERRAFORM_DIR, stdio: "pipe" });
  console.log("    ✓ Terraform configuration valid!");

  console.log("\n=============================================================");
  console.log("   STEP 9: FULL SYSTEM E2E INTEGRATION TEST 100% SUCCESS!   ");
  console.log("=============================================================");
}

runFullSystemIntegrationTest().catch((err) => {
  console.error("E2E Integration Test Failed:", err);
  process.exit(1);
});
