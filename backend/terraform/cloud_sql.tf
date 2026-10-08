# Cost-conscious Cloud SQL PostgreSQL 16 Instance
resource "google_sql_database_instance" "postgres_instance" {
  name             = "travelbus-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-f1-micro" # Minimum cost-conscious tier for development/small fleets
    availability_type = "ZONAL"       # Single zone keeps costs low

    ip_configuration {
      ipv4_enabled    = true
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }
  }

  deletion_protection = false # Set to true for critical production workloads
}

resource "google_sql_database" "travelbus_db" {
  name     = "travelbus_db"
  instance = google_sql_database_instance.postgres_instance.name
}

resource "google_sql_user" "db_user" {
  name     = "travelbus_user"
  instance = google_sql_database_instance.postgres_instance.name
  password = var.db_password
}
