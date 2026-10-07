resource "aws_sqs_queue" "file_processing_dlq" {
  name                      = var.dlq_name
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "file_processing_queue" {
  name = var.main_queue_name
  // Thời gian hiển thị message khi xử lý
  visibility_timeout_seconds = 30
  // Thời gian giữ message trong queue
  message_retention_seconds = 345600 # 4 days
  // Khi xử lý thất bại thì chuyển sang DLQ sau 3 lần
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.file_processing_dlq.arn
    maxReceiveCount     = 3
  })
}
