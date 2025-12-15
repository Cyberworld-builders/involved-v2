output "iam_user_name" {
  description = "Name of the IAM user created for SES"
  value       = aws_iam_user.ses_user.name
}

output "iam_access_key_id" {
  description = "AWS Access Key ID for SES (use this as AWS_ACCESS_KEY_ID)"
  value       = aws_iam_access_key.ses_user.id
  sensitive   = false
}

output "iam_secret_access_key" {
  description = "AWS Secret Access Key for SES (use this as AWS_SECRET_ACCESS_KEY) - SAVE THIS SECURELY!"
  value       = aws_iam_access_key.ses_user.secret
  sensitive   = true
}

output "aws_region" {
  description = "AWS region used for SES"
  value       = var.aws_region
}

output "sender_email" {
  description = "Verified sender email address"
  value       = aws_ses_email_identity.sender.email
}

output "sender_email_arn" {
  description = "ARN of the verified email identity"
  value       = aws_ses_email_identity.sender.arn
}

# Uncomment if using domain verification
# output "domain_name" {
#   description = "Verified domain name"
#   value       = var.domain_name != "" ? aws_ses_domain_identity.domain[0].domain : null
# }

# output "domain_verification_token" {
#   description = "Token to add to DNS for domain verification"
#   value       = var.domain_name != "" ? aws_ses_domain_identity.domain[0].verification_token : null
# }

# output "dkim_tokens" {
#   description = "DKIM tokens to add to DNS"
#   value       = var.domain_name != "" ? aws_ses_domain_dkim.domain[0].dkim_tokens : null
# }

output "vercel_env_commands" {
  description = "Commands to set environment variables in Vercel"
  value       = <<-EOT
    # Set AWS credentials for SES SDK
    vercel env add AWS_ACCESS_KEY_ID production
    # Enter: ${aws_iam_access_key.ses_user.id}
    
    vercel env add AWS_SECRET_ACCESS_KEY production
    # Enter: (get from terraform output -s iam_secret_access_key)
    
    vercel env add AWS_REGION production
    # Enter: ${var.aws_region}
    
    vercel env add SMTP_FROM production
    # Enter: ${var.sender_email}
    
    vercel env add SMTP_FROM_NAME production
    # Enter: ${var.sender_name}
    
    # Also add to preview and development environments
    vercel env add AWS_ACCESS_KEY_ID preview
    vercel env add AWS_SECRET_ACCESS_KEY preview
    vercel env add AWS_REGION preview
    vercel env add SMTP_FROM preview
    vercel env add SMTP_FROM_NAME preview
  EOT
  sensitive   = true
}
