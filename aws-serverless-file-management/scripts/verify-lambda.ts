import {
  LambdaClient,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "ap-southeast-1";
const functionName = process.env.LAMBDA_FUNCTION_NAME || "file-management-api";
const lambdaClient = new LambdaClient({ region });

function buildEvent(method: string, path: string, body?: any) {
  return {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      accountId: "002037730665",
      apiId: "verify-lambda-api",
      domainName: "verify.execute-api.ap-southeast-1.amazonaws.com",
      domainPrefix: "verify",
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "verify-script/1.0",
      },
      requestId: `req-${Date.now()}`,
      routeKey: `${method} ${path}`,
      stage: "$default",
      time: new Date().toUTCString(),
      timeEpoch: Date.now(),
    },
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false,
  };
}

async function invokeLambda(method: string, path: string, body?: any) {
  const payload = buildEvent(method, path, body);
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambdaClient.send(command);
  if (!response.Payload) {
    throw new Error("Empty payload from Lambda");
  }

  const raw = Buffer.from(response.Payload).toString("utf-8");
  return JSON.parse(raw);
}

async function runLiveVerification() {
  console.log("=============================================================");
  console.log("   STEP 2 VERIFICATION: AWS LAMBDA & S3 LIVE INTEGRATION");
  console.log("=============================================================");
  console.log(`Region: ${region}`);
  console.log(`Function Name: ${functionName}\n`);

  const testKey = `test-lambda-${Date.now()}.txt`;
  const testContent = `Hello AWS Lambda! Created at ${new Date().toISOString()}`;

  // Step 1: GET /files (initial list)
  console.log("[1/7] Testing GET /files on Lambda...");
  const listRes = await invokeLambda("GET", "/files");
  console.log(` -> Status: ${listRes.statusCode}`);
  const listData = JSON.parse(listRes.body);
  console.log(` -> Existing files count: ${listData.files?.length ?? 0}`);
  if (listRes.statusCode !== 200) throw new Error("Failed to list files");

  // Step 2: POST /files (direct upload via Lambda to S3)
  console.log(`\n[2/7] Testing POST /files to upload "${testKey}"...`);
  const uploadRes = await invokeLambda("POST", "/files", {
    fileName: testKey,
    content: testContent,
    contentType: "text/plain",
  });
  console.log(` -> Status: ${uploadRes.statusCode}`);
  const uploadData = JSON.parse(uploadRes.body);
  console.log(` -> Response:`, uploadData);
  if (uploadRes.statusCode !== 201) throw new Error("Failed to upload file via Lambda");

  // Step 3: GET /files/{key}/metadata
  console.log(`\n[3/7] Testing GET /files/${testKey}/metadata...`);
  const metaRes = await invokeLambda("GET", `/files/${testKey}/metadata`);
  console.log(` -> Status: ${metaRes.statusCode}`);
  const metaData = JSON.parse(metaRes.body);
  console.log(` -> Metadata:`, metaData.metadata);
  if (metaRes.statusCode !== 200 || !metaData.metadata) {
    throw new Error("Failed to get file metadata via Lambda");
  }

  // Step 4: GET /files/{key} (direct download)
  console.log(`\n[4/7] Testing GET /files/${testKey} (direct download)...`);
  const downloadRes = await invokeLambda("GET", `/files/${testKey}`);
  console.log(` -> Status: ${downloadRes.statusCode}`);
  console.log(` -> Content-Type: ${downloadRes.headers["Content-Type"]}`);
  console.log(` -> Body: "${downloadRes.body}"`);
  if (downloadRes.statusCode !== 200 || downloadRes.body !== testContent) {
    throw new Error("File content mismatch from Lambda");
  }

  // Step 5: POST /files/presigned-upload
  console.log(`\n[5/7] Testing POST /files/presigned-upload for "upload-sample.pdf"...`);
  const presignUploadRes = await invokeLambda("POST", "/files/presigned-upload", {
    fileName: "upload-sample.pdf",
    contentType: "application/pdf",
    expiresIn: 1800,
  });
  console.log(` -> Status: ${presignUploadRes.statusCode}`);
  const presignUploadData = JSON.parse(presignUploadRes.body);
  console.log(` -> Upload URL generated: ${presignUploadData.uploadUrl.substring(0, 60)}...`);
  if (presignUploadRes.statusCode !== 200 || !presignUploadData.uploadUrl) {
    throw new Error("Failed to get presigned upload URL via Lambda");
  }

  // Step 6: GET /files/{key}/presigned-download
  console.log(`\n[6/7] Testing GET /files/${testKey}/presigned-download...`);
  const presignDownloadRes = await invokeLambda("GET", `/files/${testKey}/presigned-download`);
  console.log(` -> Status: ${presignDownloadRes.statusCode}`);
  const presignDownloadData = JSON.parse(presignDownloadRes.body);
  console.log(` -> Download URL generated: ${presignDownloadData.downloadUrl.substring(0, 60)}...`);
  if (presignDownloadRes.statusCode !== 200 || !presignDownloadData.downloadUrl) {
    throw new Error("Failed to get presigned download URL via Lambda");
  }

  // Step 7: DELETE /files/{key}
  console.log(`\n[7/7] Testing DELETE /files/${testKey} (cleanup)...`);
  const deleteRes = await invokeLambda("DELETE", `/files/${testKey}`);
  console.log(` -> Status: ${deleteRes.statusCode} (Expected 204)`);
  if (deleteRes.statusCode !== 204) {
    throw new Error("Failed to delete file via Lambda");
  }

  // Verification of deletion
  const verifyDeleteRes = await invokeLambda("GET", `/files/${testKey}/metadata`);
  console.log(` -> Verification after delete status: ${verifyDeleteRes.statusCode} (Expected 404)`);
  if (verifyDeleteRes.statusCode !== 404) {
    throw new Error("File still exists after deletion");
  }

  console.log("\n=============================================================");
  console.log("   STEP 2 LIVE VERIFICATION COMPLETED SUCCESSFULLY! (7/7)   ");
  console.log("=============================================================");
}

runLiveVerification().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
