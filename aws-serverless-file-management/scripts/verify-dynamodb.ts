import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

const API_ENDPOINT =
  process.env.API_GATEWAY_URL ||
  "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";
const REGION = process.env.AWS_REGION || "ap-southeast-1";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "file-metadata";

const rawClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(rawClient);

async function runDynamoDbVerification() {
  console.log("=============================================================");
  console.log("   STEP 4 VERIFICATION: DYNAMODB METADATA LIVE INTEGRATION   ");
  console.log("=============================================================");
  console.log(`API Endpoint: ${API_ENDPOINT}`);
  console.log(`DynamoDB Table: ${TABLE_NAME}\n`);

  const testFileName = `dynamo-verify-${Date.now()}.txt`;
  const testContent = `Testing S3 and DynamoDB dual persistence! Generated at ${new Date().toISOString()}`;

  // Step 1: Initial list
  console.log("[1/7] Testing GET /files (via API Gateway & DynamoDB)...");
  const listRes = await fetch(`${API_ENDPOINT}/files`);
  console.log(` -> Status: ${listRes.status} (Expected 200)`);
  const listData = (await listRes.json()) as { files: any[] };
  console.log(` -> Current files count: ${listData.files.length}`);
  if (listRes.status !== 200) throw new Error("Failed to GET /files");

  // Step 2: POST /files (S3 + DynamoDB)
  console.log(`\n[2/7] Testing POST /files to create "${testFileName}"...`);
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
  console.log(` -> Generated FileId (UUID):`, uploadData.fileId);
  console.log(` -> DynamoDB Metadata Record:`, uploadData.metadata);

  if (uploadRes.status !== 201 || !uploadData.fileId || !uploadData.metadata) {
    throw new Error("Failed to upload file or missing metadata in response");
  }

  const fileId = uploadData.fileId;

  // Step 3: Verify record directly in AWS DynamoDB Table
  console.log(`\n[3/7] Directly querying DynamoDB Table for item id="${fileId}"...`);
  const dbResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: fileId },
    }),
  );
  console.log(` -> DynamoDB Item found:`, dbResult.Item);
  if (!dbResult.Item || dbResult.Item.fileName !== testFileName) {
    throw new Error("DynamoDB does not contain the expected metadata item");
  }

  // Step 4: GET /files/{id}/metadata via API Gateway
  console.log(`\n[4/7] Testing GET /files/${fileId}/metadata via API Gateway...`);
  const metaRes = await fetch(`${API_ENDPOINT}/files/${fileId}/metadata`);
  console.log(` -> Status: ${metaRes.status} (Expected 200)`);
  const metaData = (await metaRes.json()) as any;
  console.log(` -> Retrieved Metadata:`, metaData.metadata);
  if (metaRes.status !== 200 || metaData.metadata?.id !== fileId) {
    throw new Error("Failed to fetch metadata by fileId");
  }

  // Step 5: Test presigned upload creates pending record in DynamoDB
  console.log(`\n[5/7] Testing POST /files/presigned-upload pending record in DynamoDB...`);
  const presignRes = await fetch(`${API_ENDPOINT}/files/presigned-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: "pending-sample.pdf",
      contentType: "application/pdf",
      expiresIn: 1800,
    }),
  });
  console.log(` -> Status: ${presignRes.status} (Expected 200)`);
  const presignData = (await presignRes.json()) as any;
  console.log(` -> Pending FileId:`, presignData.fileId);

  const pendingDbResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: presignData.fileId },
    }),
  );
  console.log(` -> Pending record in DynamoDB:`, pendingDbResult.Item);
  if (!pendingDbResult.Item || pendingDbResult.Item.status !== "PENDING") {
    throw new Error("Pending upload record not found or wrong status in DynamoDB");
  }

  // Step 6: DELETE /files/{fileId}
  console.log(`\n[6/7] Testing DELETE /files/${fileId} (Cascade delete S3 + DynamoDB)...`);
  const deleteRes = await fetch(`${API_ENDPOINT}/files/${fileId}`, {
    method: "DELETE",
  });
  console.log(` -> Status: ${deleteRes.status} (Expected 204)`);
  if (deleteRes.status !== 204) throw new Error("Failed to DELETE file");

  // Step 7: Verify deletion in DynamoDB & API Gateway
  console.log(`\n[7/7] Verifying record is deleted from DynamoDB and 404 on API...`);
  const verifyDbResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: fileId },
    }),
  );
  console.log(` -> DynamoDB item after delete:`, verifyDbResult.Item ?? "null (DELETED)");
  if (verifyDbResult.Item) {
    throw new Error("Item still exists in DynamoDB after delete");
  }

  const verifyApiRes = await fetch(`${API_ENDPOINT}/files/${fileId}/metadata`);
  console.log(` -> API Gateway status after delete: ${verifyApiRes.status} (Expected 404)`);
  if (verifyApiRes.status !== 404) {
    throw new Error("API should return 404 after file deletion");
  }

  // Cleanup the pending test record from DynamoDB as well
  await fetch(`${API_ENDPOINT}/files/${presignData.fileId}`, {
    method: "DELETE",
  });

  console.log("\n=============================================================");
  console.log("   STEP 4 LIVE VERIFICATION COMPLETED SUCCESSFULLY! (7/7)   ");
  console.log("=============================================================");
}

runDynamoDbVerification().catch((err) => {
  console.error("DynamoDB live verification failed:", err);
  process.exit(1);
});
