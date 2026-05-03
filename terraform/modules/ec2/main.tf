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

# ── IAM Role — SSM + CloudWatch + ECR + Secrets Manager ──────────────────────
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

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Least-privilege: EC2 can only read secrets under the project prefix
resource "aws_iam_role_policy" "secrets_read" {
  name = "${var.project}-secrets-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:*:*:secret:${var.project}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── CloudWatch agent config factory ──────────────────────────────────────────
# Installs Docker + CloudWatch agent, writes a per-tier CW config, then starts both.
# $${aws:InstanceId} — double $ escapes Terraform interpolation; bash sees ${aws:InstanceId}
# which the CW agent resolves at runtime.
locals {
  web_user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker amazon-cloudwatch-agent
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
    {
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [{
              "file_path": "/var/lib/docker/containers/**/*-json.log",
              "log_group_name": "/${var.project}/web",
              "log_stream_name": "{instance_id}",
              "timezone": "UTC"
            }]
          }
        }
      },
      "metrics": {
        "append_dimensions": { "InstanceId": "$${aws:InstanceId}" },
        "metrics_collected": {
          "cpu":  { "measurement": ["cpu_usage_idle", "cpu_usage_user"], "metrics_collection_interval": 60, "totalcpu": true },
          "disk": { "measurement": ["used_percent"], "metrics_collection_interval": 60, "resources": ["/"] },
          "mem":  { "measurement": ["mem_used_percent"], "metrics_collection_interval": 60 }
        }
      }
    }
    CWEOF

    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s \
      -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json || true
  EOF

  api_user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker amazon-cloudwatch-agent
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
    {
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [{
              "file_path": "/var/lib/docker/containers/**/*-json.log",
              "log_group_name": "/${var.project}/api",
              "log_stream_name": "{instance_id}",
              "timezone": "UTC"
            }]
          }
        }
      },
      "metrics": {
        "append_dimensions": { "InstanceId": "$${aws:InstanceId}" },
        "metrics_collected": {
          "cpu":  { "measurement": ["cpu_usage_idle", "cpu_usage_user"], "metrics_collection_interval": 60, "totalcpu": true },
          "disk": { "measurement": ["used_percent"], "metrics_collection_interval": 60, "resources": ["/"] },
          "mem":  { "measurement": ["mem_used_percent"], "metrics_collection_interval": 60 }
        }
      }
    }
    CWEOF

    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s \
      -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json || true
  EOF

  db_user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker amazon-cloudwatch-agent
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
    {
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [{
              "file_path": "/var/lib/docker/containers/**/*-json.log",
              "log_group_name": "/${var.project}/db",
              "log_stream_name": "{instance_id}",
              "timezone": "UTC"
            }]
          }
        }
      },
      "metrics": {
        "append_dimensions": { "InstanceId": "$${aws:InstanceId}" },
        "metrics_collected": {
          "cpu":  { "measurement": ["cpu_usage_idle", "cpu_usage_user"], "metrics_collection_interval": 60, "totalcpu": true },
          "disk": { "measurement": ["used_percent"], "metrics_collection_interval": 60, "resources": ["/", "/data"] },
          "mem":  { "measurement": ["mem_used_percent"], "metrics_collection_interval": 60 }
        }
      }
    }
    CWEOF

    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s \
      -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json || true
  EOF
}

# ── Web Tier EC2 (public subnet — runs Next.js container) ────────────────────
resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type_web
  subnet_id              = var.web_subnet_id
  vpc_security_group_ids = [var.sg_web_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.web_user_data

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
  user_data              = local.api_user_data

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
  user_data              = local.db_user_data

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

# ── EBS Snapshot Lifecycle — daily MongoDB backup, 7-day retention ───────────
resource "aws_iam_role" "dlm" {
  name = "${var.project}-dlm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "mongodb_snapshot" {
  description        = "Daily MongoDB EBS snapshot - 7-day retention"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    schedule {
      name = "Daily"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["02:00"]
      }

      retain_rule {
        count = 7
      }

      tags_to_add = {
        SnapshotCreatedBy = "DLM"
      }

      copy_tags = true
    }

    target_tags = {
      Name = "${var.project}-mongodb-data"
    }
  }

  tags = local.tags
}
