import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
import { sendToDeadLetterQueue } from "../src/services/sqs.service.js";

dotenv.config();

const API_ENDPOINT =
  process.env.API_GATEWAY_URL ||
  "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";
const REGION = process.env.AWS_REGION || "ap-southeast-1";
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;
const SQS_DLQ_URL = process.env.SQS_DLQ_URL!;

const sqsClient = new SQSClient({ region: REGION });

async function runSqsVerification() {
  console.log("=============================================================");
  console.log("   STEP 5 VERIFICATION: SQS & DEAD LETTER QUEUE (DLQ) LIVE   ");
  console.log("=============================================================");
  console.log(`API Endpoint: ${API_ENDPOINT}`);
  console.log(`SQS Main Queue: ${SQS_QUEUE_URL}`);
  console.log(`SQS DLQ: ${SQS_DLQ_URL}\n`);

  const testFileName = `sqs-verify-${Date.now()}.txt`;
  const testContent = `Testing SQS queue decoupling! Created at ${new Date().toISOString()}`;

  // Step 1: Initial Queue Metrics
  console.log("[1/6] Testing GET /queue/metrics via API Gateway...");
  const metricsRes = await fetch(`${API_ENDPOINT}/queue/metrics`);
  console.log(` -> Status: ${metricsRes.status} (Expected 200)`);
  const metricsData = (await metricsRes.json()) as any;
  console.log(` -> Initial Metrics:`, metricsData.metrics);
  if (metricsRes.status !== 200) throw new Error("Failed to get queue metrics");

  // Step 2: Upload file -> S3 + DynamoDB + SQS Message dispatch
  console.log(`\n[2/6] Testing POST /files to upload "${testFileName}" and trigger SQS message...`);
  const uploadRes = await fetch(`${API_ENDPOINT}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: testFileName,
      content: testContent,
      contentType: "text/plain",
    }),
  });
  console.log(` -> Status: ${uploadRes.status} (Expected 201)`);
  const uploadData = (await uploadRes.json()) as any;
  console.log(` -> FileId: ${uploadData.fileId}`);
  console.log(` -> SQS MessageId: ${uploadData.sqsMessageId}`);
  if (uploadRes.status !== 201 || !uploadData.sqsMessageId) {
    throw new Error("Failed to upload file or missing sqsMessageId in response");
  }

  const fileId = uploadData.fileId;

  // Step 3: Verify message in SQS main queue via attributes
  console.log(`\n[3/6] Checking SQS queue status via GET /queue/metrics...`);
  const queueStatusRes = await fetch(`${API_ENDPOINT}/queue/metrics`);
  const queueStatusData = (await queueStatusRes.json()) as any;
  console.log(` -> Queue Metrics after upload:`, queueStatusData.metrics);

  // Step 4: Trigger Worker processing via POST /queue/process
  console.log(`\n[4/6] Triggering POST /queue/process to consume and process messages...`);
  const processRes = await fetch(`${API_ENDPOINT}/queue/process`, {
    method: "POST",
  });
  console.log(` -> Status: ${processRes.status} (Expected 200)`);
  const processData = (await processRes.json()) as any;
  console.log(` -> Processed count: ${processData.processedCount}`);
  console.log(` -> Processing results:`, processData.results);
  if (processRes.status !== 200 || processData.processedCount < 1) {
    throw new Error("Failed to process message from queue");
  }

  // Step 5: Test Dead Letter Queue (DLQ) mechanism
  console.log(`\n[5/6] Testing Dead Letter Queue (DLQ) ingestion...`);
  const dlqRes = await sendToDeadLetterQueue(
    { corruptedPayload: "invalid-binary-chunk-xyz" },
    "Failed after 3 retries: Malformed payload",
  );
  console.log(` -> DLQ MessageId generated: ${dlqRes.messageId}`);
  if (!dlqRes.messageId) throw new Error("Failed to send message to DLQ");

  // Read message from DLQ to verify isolation
  const dlqReceive = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: SQS_DLQ_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 2,
    }),
  );
  console.log(` -> Message successfully verified in DLQ: ${dlqReceive.Messages?.length ?? 0} item(s)`);
  if (!dlqReceive.Messages || dlqReceive.Messages.length === 0) {
    throw new Error("Expected message in DLQ");
  }

  // Clean up message from DLQ
  if (dlqReceive.Messages[0]?.ReceiptHandle) {
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: SQS_DLQ_URL,
        ReceiptHandle: dlqReceive.Messages[0].ReceiptHandle,
      }),
    );
    console.log(` -> Cleaned up DLQ test message.`);
  }

  // Step 6: Cleanup test file from S3 and DynamoDB
  console.log(`\n[6/6] Cleaning up test file "${fileId}"...`);
  const deleteRes = await fetch(`${API_ENDPOINT}/files/${fileId}`, {
    method: "DELETE",
  });
  console.log(` -> Delete Status: ${deleteRes.status} (Expected 204)`);

  console.log("\n=============================================================");
  console.log("   STEP 5 LIVE VERIFICATION COMPLETED SUCCESSFULLY! (6/6)   ");
  console.log("=============================================================");
}

runSqsVerification().catch((err) => {
  console.error("SQS Live verification failed:", err);
  process.exit(1);
});
