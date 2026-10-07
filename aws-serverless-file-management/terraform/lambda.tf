resource "aws_lambda_function" "api_handler" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 15
  memory_size   = 256

  filename         = "${path.module}/../dist/lambda/function.zip"
  source_code_hash = fileexists("${path.module}/../dist/lambda/function.zip") ? filebase64sha256("${path.module}/../dist/lambda/function.zip") : null

  environment {
    variables = {
      S3_BUCKET_NAME      = aws_s3_bucket.file_storage.id
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.file_metadata.id
      SQS_QUEUE_URL       = aws_sqs_queue.file_processing_queue.id
      SQS_DLQ_URL         = aws_sqs_queue.file_processing_dlq.id
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy.lambda_services_access
  ]
}
