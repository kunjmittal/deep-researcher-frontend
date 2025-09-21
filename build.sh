#!/bin/bash

echo "🚀 Building React app for production..."

# Install dependencies
npm install

# Build for production
npm run build

echo "✅ Build completed successfully!"
echo "📁 Build files are in the 'build' directory"
