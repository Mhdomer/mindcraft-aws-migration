variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnets" {
  type = list(string)
}

variable "sg_alb_id" {
  type = string
}

variable "web_instance_id" {
  type = string
}
