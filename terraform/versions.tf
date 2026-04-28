terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "mindcraft-tfstate-327327821586"
    key            = "mindcraft/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "mindcraft-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
