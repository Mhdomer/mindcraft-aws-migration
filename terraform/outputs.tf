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
