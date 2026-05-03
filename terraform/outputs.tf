output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer — use this as the app URL"
  value       = module.alb.alb_dns_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "web_instance_id" {
  description = "Web tier EC2 instance ID (connect via SSM Session Manager)"
  value       = module.ec2.web_instance_id
}

output "api_instance_id" {
  description = "App tier EC2 instance ID (connect via SSM Session Manager)"
  value       = module.ec2.api_instance_id
}

output "db_instance_id" {
  description = "DB tier EC2 instance ID (connect via SSM Session Manager)"
  value       = module.ec2.db_instance_id
}

output "sns_alerts_arn" {
  description = "SNS topic ARN for CloudWatch alarms — confirm the email subscription after first apply"
  value       = module.cloudwatch.sns_topic_arn
}

output "secrets_manager_arns" {
  description = "Secrets Manager ARNs — populate values with: aws secretsmanager put-secret-value --secret-id <name> --secret-string <value>"
  value = {
    jwt_secret    = module.secrets.jwt_secret_arn
    mongodb_uri   = module.secrets.mongodb_uri_arn
    gemini_api_key = module.secrets.gemini_api_key_arn
  }
}
