# Deploy TravelBus Manager API to Google Cloud Run (PowerShell)
param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = "us-central1",
    [string]$ServiceName = "travelbus-api"
)

if (-not $ProjectId) {
    $ProjectId = "travelbus-manager-prod"
}

$RepoName = "travelbus-repo"
$ImageName = "travelbus-api"
$ImageTag = "latest"
$ImageUri = "${Region}-docker.pkg.dev/${ProjectId}/${RepoName}/${ImageName}:${ImageTag}"

Write-Host "=== Deploying TravelBus Manager to Cloud Run ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "Image:   $ImageUri"

# 1. Configure Docker auth
gcloud auth configure-docker "${Region}-docker.pkg.dev" --quiet

# 2. Build & Push
Write-Host "Building Docker image..." -ForegroundColor Green
docker build -t $ImageUri -f Dockerfile .

Write-Host "Pushing Docker image to Artifact Registry..." -ForegroundColor Green
docker push $ImageUri

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --project=$ProjectId `
    --region=$Region `
    --image=$ImageUri `
    --platform="managed" `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5 `
    --concurrency=80 `
    --cpu-throttling `
    --memory="512Mi" `
    --cpu="1" `
    --set-env-vars="ENVIRONMENT=production,LOG_LEVEL=INFO,GCP_PROJECT_ID=$ProjectId" `
    --set-secrets="SECRET_KEY=SECRET_KEY:latest,DATABASE_URL=DATABASE_URL:latest"

Write-Host "=== Deployment Completed! ===" -ForegroundColor Cyan
