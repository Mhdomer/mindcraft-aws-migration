locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Log Groups — 7-day retention to keep costs low ───────────────────────────
resource "aws_cloudwatch_log_group" "web" {
  name              = "/${var.project}/web"
  retention_in_days = 7
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/${var.project}/api"
  retention_in_days = 7
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "db" {
  name              = "/${var.project}/db"
  retention_in_days = 7
  tags              = local.tags
}

# ── SNS Topic — alert destination for all alarms ─────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-alerts"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── CPU Alarms — trigger if average exceeds 80% for two consecutive 5-min periods
resource "aws_cloudwatch_metric_alarm" "web_cpu" {
  alarm_name          = "${var.project}-web-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Web tier CPU above 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = var.web_instance_id
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "api_cpu" {
  alarm_name          = "${var.project}-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "API tier CPU above 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = var.api_instance_id
  }

  tags = local.tags
}
