output "sg_alb_id" {
  value = aws_security_group.alb.id
}

output "sg_web_id" {
  value = aws_security_group.web.id
}

output "sg_api_id" {
  value = aws_security_group.api.id
}

output "sg_db_id" {
  value = aws_security_group.db.id
}
