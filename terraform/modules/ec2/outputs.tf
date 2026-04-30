output "web_instance_id" {
  value = aws_instance.web.id
}

output "api_instance_id" {
  value = aws_instance.api.id
}

output "db_instance_id" {
  value = aws_instance.db.id
}

output "instance_profile_name" {
  value = aws_iam_instance_profile.ec2.name
}
