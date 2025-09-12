#!/bin/bash

# Auto deploy script
echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm ci

echo "📦 Installing backend dependencies..."
cd ../backend && npm ci

# Build applications
echo "🏗️ Building frontend..."
cd ../frontend && npm run build

echo "🏗️ Building backend..."
cd ../backend && npm run build

# Restart services (assuming you're using PM2)
echo "🔄 Restarting services..."
pm2 restart student-management-frontend
pm2 restart student-management-backend

echo "✅ Deployment completed successfully!"
