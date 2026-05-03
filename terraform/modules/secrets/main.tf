locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Terraform creates the secret ARNs; values are set separately via:
#   aws secretsmanager put-secret-value --secret-id mindcraft/jwt-secret --secret-string "..."
# recovery_window_in_days = 0 allows instant deletion on terraform destroy (portfolio cleanup).

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/jwt-secret"
  description             = "JWT signing secret for MindCraft API"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret" "mongodb_uri" {
  name                    = "${var.project}/mongodb-uri"
  description             = "MongoDB connection string for MindCraft API"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret" "gemini_api_key" {
  name                    = "${var.project}/gemini-api-key"
  description             = "Google Gemini API key for MindCraft AI features"
  recovery_window_in_days = 0
  tags                    = local.tags
}
