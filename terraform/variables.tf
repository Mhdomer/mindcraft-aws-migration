variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Project name — used as a prefix on all resource names"
  type        = string
  default     = "mindcraft"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_type_web" {
  description = "EC2 instance type — web tier (Next.js)"
  type        = string
  default     = "t3.micro"
}

variable "instance_type_api" {
  description = "EC2 instance type — app tier (Express API)"
  type        = string
  default     = "t3.micro"
}

variable "instance_type_db" {
  description = "EC2 instance type — DB tier (MongoDB)"
  type        = string
  default     = "t3.micro"
}
