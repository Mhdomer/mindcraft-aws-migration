locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Latest Amazon Linux 2023 AMI ─────────────────────────────────────────────
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── IAM Role — SSM Session Manager + CloudWatch Logs ─────────────────────────
resource "aws_iam_role" "ec2" {
  name = "${var.project}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── User Data — installs Docker on Amazon Linux 2023 ─────────────────────────
locals {
  docker_user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  EOF
}

# ── Web Tier EC2 (public subnet — runs Next.js container) ────────────────────
resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type_web
  subnet_id              = var.web_subnet_id
  vpc_security_group_ids = [var.sg_web_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.docker_user_data

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(local.tags, { Name = "${var.project}-web", Tier = "web" })
}

# ── App Tier EC2 (private subnet — runs Express API container) ───────────────
resource "aws_instance" "api" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type_api
  subnet_id              = var.api_subnet_id
  vpc_security_group_ids = [var.sg_api_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.docker_user_data

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(local.tags, { Name = "${var.project}-api", Tier = "app" })
}

# ── DB Tier EC2 (private subnet — runs MongoDB container) ────────────────────
resource "aws_instance" "db" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type_db
  subnet_id              = var.db_subnet_id
  vpc_security_group_ids = [var.sg_db_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.docker_user_data

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(local.tags, { Name = "${var.project}-db", Tier = "db" })
}

# ── Separate EBS volume for MongoDB data persistence ─────────────────────────
resource "aws_ebs_volume" "mongodb_data" {
  availability_zone = aws_instance.db.availability_zone
  size              = 20
  type              = "gp3"
  tags              = merge(local.tags, { Name = "${var.project}-mongodb-data" })
}

resource "aws_volume_attachment" "mongodb_data" {
  device_name  = "/dev/sdf"
  volume_id    = aws_ebs_volume.mongodb_data.id
  instance_id  = aws_instance.db.id
  force_detach = false
}
