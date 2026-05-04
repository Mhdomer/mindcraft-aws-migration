module "vpc" {
  source      = "./modules/vpc"
  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  aws_region  = var.aws_region
}

module "security_groups" {
  source      = "./modules/security-groups"
  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

module "ec2" {
  source      = "./modules/ec2"
  project     = var.project
  environment = var.environment

  web_subnet_id = module.vpc.public_subnet_ids[0]
  api_subnet_id = module.vpc.app_private_subnet_ids[0]
  db_subnet_id  = module.vpc.db_private_subnet_ids[0]

  sg_web_id = module.security_groups.sg_web_id
  sg_api_id = module.security_groups.sg_api_id
  sg_db_id  = module.security_groups.sg_db_id

  instance_type_web = var.instance_type_web
  instance_type_api = var.instance_type_api
  instance_type_db  = var.instance_type_db
}

module "alb" {
  source      = "./modules/alb"
  project     = var.project
  environment = var.environment

  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnet_ids
  sg_alb_id       = module.security_groups.sg_alb_id
  web_instance_id = module.ec2.web_instance_id
}

module "cloudwatch" {
  source      = "./modules/cloudwatch"
  project     = var.project
  environment = var.environment

  alert_email     = var.alert_email
  web_instance_id = module.ec2.web_instance_id
  api_instance_id = module.ec2.api_instance_id
}
