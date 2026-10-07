import {
  uploadContent,
  getFileContent,
  getFileMetadata,
  checkFileExists,
  getPresignedDownloadUrl,
  listFiles,
  deleteFile,
} from "../src/services/s3.service.js";

async function verifyS3(): Promise<void> {
  const testKey = `test-verify-${Date.now()}.txt`;
  const testContent = "AWS Serverless S3 Step 1 Verification Passed!";

  console.log(`[1/7] Uploading test file "${testKey}" to S3...`);
  await uploadContent(testKey, testContent, "text/plain");
  console.log(" -> Upload successful.");

  console.log(`[2/7] Checking if file exists on S3...`);
  const exists = await checkFileExists(testKey);
  if (!exists) throw new Error(`File ${testKey} does not exist on S3!`);
  console.log(" -> checkFileExists passed (true).");

  console.log(`[3/7] Fetching file metadata from S3...`);
  const metadata = await getFileMetadata(testKey);
  console.log(" -> Metadata:", metadata);
  if (metadata.size !== Buffer.byteLength(testContent)) {
    throw new Error(`Size mismatch: expected ${Buffer.byteLength(testContent)}, got ${metadata.size}`);
  }

  console.log(`[4/7] Generating Presigned Download URL...`);
  const presignedUrl = await getPresignedDownloadUrl(testKey, 300);
  console.log(" -> Presigned URL generated:", presignedUrl.substring(0, 80) + "...");

  console.log(`[5/7] Reading file content from S3...`);
  const downloaded = await getFileContent(testKey);
  if (downloaded.content !== testContent) {
    throw new Error(`Content mismatch! Expected "${testContent}", got "${downloaded.content}"`);
  }
  console.log(" -> Downloaded content matches.");

  console.log(`[6/7] Listing files on S3...`);
  const files = await listFiles();
  const found = files.some((f) => f.key === testKey);
  if (!found) throw new Error(`File ${testKey} not found in listFiles!`);
  console.log(` -> Found file in bucket listing (${files.length} total files).`);

  console.log(`[7/7] Deleting test file from S3...`);
  await deleteFile(testKey);
  const stillExists = await checkFileExists(testKey);
  if (stillExists) throw new Error(`File still exists after deletion!`);
  console.log(" -> File deleted successfully.");

  console.log("\n All S3 live operations verified successfully with AWS!");
}

verifyS3().catch((err) => {
  console.error("❌ S3 Verification Failed:", err);
  process.exit(1);
});
