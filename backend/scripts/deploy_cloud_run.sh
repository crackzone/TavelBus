#!/usr/bin/env bash
# Deploy TravelBus Manager API to Google Cloud Run
set -euo pipefail

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-travelbus-manager-prod}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="travelbus-repo"
IMAGE_NAME="travelbus-api"
SERVICE_NAME="travelbus-api"
IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=== Deploying TravelBus Manager to Cloud Run ==="
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "Image:   ${IMAGE_URI}"

# 1. Configure Docker authentication with Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# 2. Build and push image
echo "Building Docker container..."
docker build -t "${IMAGE_URI}" -f Dockerfile .

echo "Pushing image to Artifact Registry..."
docker push "${IMAGE_URI}"

# 3. Deploy to Cloud Run with scale-to-zero defaults and mounted secrets
echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --image="${IMAGE_URI}" \
    --platform="managed" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5 \
    --concurrency=80 \
    --cpu-throttling \
    --memory="512Mi" \
    --cpu="1" \
    --set-env-vars="ENVIRONMENT=production,LOG_LEVEL=INFO,GCP_PROJECT_ID=${PROJECT_ID}" \
    --set-secrets="SECRET_KEY=SECRET_KEY:latest,DATABASE_URL=DATABASE_URL:latest"

echo "=== Deployment Successfully Completed ==="
gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --format="value(status.url)"
