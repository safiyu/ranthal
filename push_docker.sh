#!/bin/bash

# Build the Docker image
echo "Building Docker image..."
docker build -t safiyu/ranthal:latest .

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push safiyu/ranthal:latest

echo "Successfully built and pushed safiyu/ranthal:latest"