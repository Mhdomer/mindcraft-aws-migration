output "jwt_secret_arn" {
  description = "ARN of the JWT secret in Secrets Manager"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "mongodb_uri_arn" {
  description = "ARN of the MongoDB URI secret in Secrets Manager"
  value       = aws_secretsmanager_secret.mongodb_uri.arn
}

output "gemini_api_key_arn" {
  description = "ARN of the Gemini API key secret in Secrets Manager"
  value       = aws_secretsmanager_secret.gemini_api_key.arn
}
