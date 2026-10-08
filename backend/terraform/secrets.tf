# Secret Manager Secrets
resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "SECRET_KEY"

  replication {
    auto {}
  }
}

# Example initial secret payload values (can also be managed via gcloud CLI or CI/CD)
resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret_value
}
