output "ses_role_arn" {
  description = "ARN of the IAM role for Vercel OIDC → SES (set as AWS_ROLE_ARN in Vercel)"
  value       = aws_iam_role.vercel_ses_role.arn
}

output "aws_region" {
  description = "AWS region for SES (set as AWS_REGION in Vercel)"
  value       = var.aws_region
}

output "sender_email" {
  description = "Verified sender email address (set as SMTP_FROM in Vercel)"
  value       = aws_ses_email_identity.noreply.email
}

output "oidc_provider_staging" {
  description = "OIDC provider ARN for staging Vercel team"
  value       = aws_iam_openid_connect_provider.vercel_staging.arn
}

output "oidc_provider_production" {
  description = "OIDC provider ARN for production Vercel team"
  value       = aws_iam_openid_connect_provider.vercel_production.arn
}

output "vercel_env_vars" {
  description = "Environment variables to set in both Vercel projects"
  value       = <<-EOT
    AWS_ROLE_ARN=${aws_iam_role.vercel_ses_role.arn}
    AWS_REGION=${var.aws_region}
    SMTP_FROM=${var.sender_email}
    SMTP_FROM_NAME=${var.sender_name}
  EOT
}
