output "sns_topic_arn" {
  description = "ARN of the alerts SNS topic"
  value       = aws_sns_topic.alerts.arn
}

output "log_group_web" {
  description = "CloudWatch log group name for the web tier"
  value       = aws_cloudwatch_log_group.web.name
}

output "log_group_api" {
  description = "CloudWatch log group name for the API tier"
  value       = aws_cloudwatch_log_group.api.name
}

output "log_group_db" {
  description = "CloudWatch log group name for the DB tier"
  value       = aws_cloudwatch_log_group.db.name
}
