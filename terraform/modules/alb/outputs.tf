output "alb_dns_name" {
  description = "DNS name of the ALB — use this as the app URL until a custom domain is added"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "target_group_arn" {
  value = aws_lb_target_group.web.arn
}
