output "api_endpoint" {
  description = "Public URL of the API Gateway HTTP API"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "s3_bucket_name" {
  description = "Name of the S3 storage bucket"
  value       = aws_s3_bucket.file_storage.id
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB metadata table"
  value       = aws_dynamodb_table.file_metadata.id
}

output "sqs_queue_url" {
  description = "URL of the primary SQS queue"
  value       = aws_sqs_queue.file_processing_queue.id
}

output "sqs_dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.file_processing_dlq.id
}

output "lambda_function_name" {
  description = "Name of the deployed Lambda function"
  value       = aws_lambda_function.api_handler.function_name
}
