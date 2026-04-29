locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── ALB — accepts HTTP/HTTPS from internet ────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.project}-sg-alb"
  description = "ALB — inbound HTTP and HTTPS from internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${var.project}-sg-alb" })
}

# ── Web Tier — port 3000 from ALB only ───────────────────────────────────────
resource "aws_security_group" "web" {
  name        = "${var.project}-sg-web"
  description = "Web tier — inbound port 3000 from ALB only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Next.js from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${var.project}-sg-web" })
}

# ── App Tier — port 3001 from web tier only ───────────────────────────────────
resource "aws_security_group" "api" {
  name        = "${var.project}-sg-api"
  description = "App tier — inbound port 3001 from web tier only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Express API from web tier"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${var.project}-sg-api" })
}

# ── DB Tier — port 27017 from app tier only ───────────────────────────────────
resource "aws_security_group" "db" {
  name        = "${var.project}-sg-db"
  description = "DB tier — inbound port 27017 from app tier only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from app tier"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${var.project}-sg-db" })
}
