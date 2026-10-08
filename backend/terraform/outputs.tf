output "cloud_run_url" {
  value       = google_cloud_run_v2_service.api_service.uri
  description = "Public URL of the deployed Cloud Run service"
}

output "artifact_registry_repo" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.name}"
  description = "Artifact Registry container repository path"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.postgres_instance.connection_name
  description = "Cloud SQL Instance connection name for proxy and unix sockets"
}
