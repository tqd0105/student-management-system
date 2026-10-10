# ==============================================================================
# AWS CloudFront CDN Distribution with Origin Access Control (OAC)
# Phân phối file S3 qua mạng CDN toàn cầu với bảo mật OAC chuẩn hiện đại
# ==============================================================================

resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "s3-file-storage-oac-${var.environment}"
  description                       = "Origin Access Control for S3 file storage bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "file_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront CDN for Student Management System File Storage"
  default_root_object = ""

  origin {
    domain_name              = aws_s3_bucket.file_storage.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.file_storage.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.file_storage.id}"

    # AWS Managed CachingOptimized Policy ID
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    # AWS Managed CORS-With-Preflight Policy ID
    response_headers_policy_id = "5cc3b908-e619-4b99-88e5-2cf7f45965bd"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "file-storage-cdn-${var.environment}"
  }
}

# Bucket Policy: Chỉ cho phép CloudFront OAC đọc dữ liệu từ S3
resource "aws_s3_bucket_policy" "file_storage_cloudfront_policy" {
  bucket = aws_s3_bucket.file_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.file_storage.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.file_cdn.arn
          }
        }
      }
    ]
  })
}
