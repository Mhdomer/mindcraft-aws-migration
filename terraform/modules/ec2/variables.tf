variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "web_subnet_id" {
  type = string
}

variable "api_subnet_id" {
  type = string
}

variable "db_subnet_id" {
  type = string
}

variable "sg_web_id" {
  type = string
}

variable "sg_api_id" {
  type = string
}

variable "sg_db_id" {
  type = string
}

variable "instance_type_web" {
  type = string
}

variable "instance_type_api" {
  type = string
}

variable "instance_type_db" {
  type = string
}
