# Configure AWS Provider
# Uses the "involved-v2-ses" profile for account 344151725195
# Run setup-aws-profile.sh first to create this profile if it doesn't exist
provider "aws" {
  region  = var.aws_region
  profile = "involved-v2-ses"
}

# IAM User for SES email sending
resource "aws_iam_user" "ses_user" {
  name = var.iam_user_name
  tags = var.tags
}

# IAM Policy for SES email sending
resource "aws_iam_user_policy" "ses_send_email" {
  name = "${var.iam_user_name}-ses-send-email"
  user = aws_iam_user.ses_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Access Key for the SES user
# Note: The secret key is only shown once - save it securely!
resource "aws_iam_access_key" "ses_user" {
  user = aws_iam_user.ses_user.name
}

# SES Email Identity (verifies the sender email address)
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# SES Domain Identity (optional - uncomment if using domain verification)
# resource "aws_ses_domain_identity" "domain" {
#   count  = var.domain_name != "" ? 1 : 0
#   domain = var.domain_name
# }

# SES Domain DKIM (optional - uncomment if using domain verification)
# resource "aws_ses_domain_dkim" "domain" {
#   count  = var.domain_name != "" ? 1 : 0
#   domain = aws_ses_domain_identity.domain[0].domain
# }

# SES Domain Mail From (optional - uncomment if using domain verification)
# resource "aws_ses_domain_mail_from" "domain" {
#   count           = var.domain_name != "" ? 1 : 0
#   domain          = aws_ses_domain_identity.domain[0].domain
#   mail_from_domain = "mail.${var.domain_name}"
# }
