variable "aws_region" {
  description = "AWS region for all infrastructure resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "bucket_name" {
  description = "Unique name of the S3 bucket for storing files"
  type        = string
  default     = "aws-serverless-file-management-tqd0105-2026"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for file metadata"
  type        = string
  default     = "file-metadata"
}

variable "lambda_function_name" {
  description = "Name of the AWS Lambda function"
  type        = string
  default     = "file-management-api"
}

variable "main_queue_name" {
  description = "Name of the primary SQS processing queue"
  type        = string
  default     = "file-processing-queue"
}

variable "dlq_name" {
  description = "Name of the SQS dead letter queue"
  type        = string
  default     = "file-processing-dlq"
}

variable "api_name" {
  description = "Name of the API Gateway HTTP API"
  type        = string
  default     = "file-management-http-api"
}
