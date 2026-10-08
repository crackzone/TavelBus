variable "project_id" {
  type        = string
  description = "Google Cloud Project ID"
  default     = "travelbus-manager-prod"
}

variable "region" {
  type        = string
  description = "Google Cloud primary region"
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "Environment identifier (prod, staging)"
  default     = "prod"
}

variable "jwt_secret_value" {
  type        = string
  description = "Initial secret key for JWT token signing"
  sensitive   = true
  default     = "production_super_secret_signing_key_replace_me_12345"
}

variable "db_password" {
  type        = string
  description = "PostgreSQL user password"
  sensitive   = true
  default     = "change_me_super_secure_db_password"
}
