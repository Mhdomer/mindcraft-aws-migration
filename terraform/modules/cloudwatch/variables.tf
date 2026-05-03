variable "project" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
}

variable "web_instance_id" {
  description = "Web tier EC2 instance ID"
  type        = string
}

variable "api_instance_id" {
  description = "App tier EC2 instance ID"
  type        = string
}
