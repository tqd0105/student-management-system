terraform {
  required_version = ">= 1.5.0"

  required_providers {
    // Nhà cung cấp AWS
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    // Giải nén và đóng gói file zip
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "student-management-system"
      Service     = "file-management"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
