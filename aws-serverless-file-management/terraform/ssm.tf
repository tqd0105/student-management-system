resource "aws_ssm_parameter" "s3_bucket_name" {
  name        = "/sms/config/s3_bucket"
  description = "Amazon S3 bucket name for SMS file storage"
  type        = "String"
  value       = aws_s3_bucket.file_storage.id
}

resource "aws_ssm_parameter" "api_endpoint" {
  name        = "/sms/config/api_endpoint"
  description = "Amazon API Gateway v2 base URL"
  type        = "String"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

resource "aws_ssm_parameter" "dynamodb_table" {
  name        = "/sms/config/dynamodb_table"
  description = "DynamoDB metadata table name"
  type        = "String"
  value       = aws_dynamodb_table.file_metadata.name
}

resource "aws_ssm_parameter" "sqs_queue_url" {
  name        = "/sms/config/sqs_queue_url"
  description = "Amazon SQS main processing queue URL"
  type        = "String"
  value       = aws_sqs_queue.file_processing_queue.url
}
