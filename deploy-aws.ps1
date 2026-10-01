# Script cập nhật nhanh ứng dụng lên AWS EC2 từ máy local
$ErrorActionPreference = "Stop"

Write-Host "🚀 [1/4] Đang đăng nhập vào Amazon ECR..." -ForegroundColor Cyan
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com

Write-Host "`n📦 [2/4] Đang Build và Push Docker Image cho Backend..." -ForegroundColor Cyan
docker build -t 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com/student-management-backend:latest -f backend/Dockerfile .
docker push 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com/student-management-backend:latest

Write-Host "`n📦 [3/4] Đang Build và Push Docker Image cho Frontend..." -ForegroundColor Cyan
docker build -t 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com/student-management-frontend:latest -f frontend/Dockerfile .
docker push 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com/student-management-frontend:latest

Write-Host "`n🔄 [4/4] Đang SSH vào EC2 (47.129.226.97) để kéo bản mới và restart..." -ForegroundColor Cyan
ssh -i .\student-key.pem -o StrictHostKeyChecking=no ubuntu@47.129.226.97 "aws ecr get-login-password --region ap-southeast-1 | sudo docker login --username AWS --password-stdin 002037730665.dkr.ecr.ap-southeast-1.amazonaws.com && cd /app && sudo docker compose pull && sudo docker compose up -d --remove-orphans && sudo docker image prune -f"

Write-Host "`n🎉 Hoàn thành! Ứng dụng trên AWS EC2 đã được cập nhật bản mới nhất tại: http://47.129.226.97" -ForegroundColor Green
