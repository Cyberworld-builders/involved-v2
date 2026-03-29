# Configure AWS Provider
# Uses the "sandbox-profile" SSO profile for account 068732175988
# SES production access is in us-east-2
provider "aws" {
  region  = var.aws_region
  profile = "sandbox-profile"
}

# --------------------------------------------------------------------------
# OIDC Providers for Vercel (allows Vercel functions to assume IAM roles)
# --------------------------------------------------------------------------

resource "aws_iam_openid_connect_provider" "vercel_staging" {
  url             = "https://oidc.vercel.com/${var.vercel_team_staging}"
  client_id_list  = ["https://vercel.com/${var.vercel_team_staging}"]
  thumbprint_list = ["a031c46782e6e6c662c2c87c76da9aa62ccabd8e"]
  tags            = var.tags
}

resource "aws_iam_openid_connect_provider" "vercel_production" {
  url             = "https://oidc.vercel.com/${var.vercel_team_production}"
  client_id_list  = ["https://vercel.com/${var.vercel_team_production}"]
  thumbprint_list = ["a031c46782e6e6c662c2c87c76da9aa62ccabd8e"]
  tags            = var.tags
}

# --------------------------------------------------------------------------
# IAM Role for SES sending via Vercel OIDC
# --------------------------------------------------------------------------

resource "aws_iam_role" "vercel_ses_role" {
  name = var.iam_role_name
  tags = var.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.vercel_staging.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${aws_iam_openid_connect_provider.vercel_staging.url}:aud" = "https://vercel.com/${var.vercel_team_staging}"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.vercel_production.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${aws_iam_openid_connect_provider.vercel_production.url}:aud" = "https://vercel.com/${var.vercel_team_production}"
          }
        }
      }
    ]
  })
}

# SES send policy
resource "aws_iam_role_policy" "ses_send" {
  name = "talent-assessment-ses-production-send-policy"
  role = aws_iam_role.vercel_ses_role.id

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

# SES config policy (for reading SES account info)
resource "aws_iam_role_policy" "ses_config" {
  name = "talent-assessment-ses-production-config-policy"
  role = aws_iam_role.vercel_ses_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:GetSendQuota",
          "ses:GetSendStatistics",
          "ses:GetAccountSendingEnabled"
        ]
        Resource = "*"
      }
    ]
  })
}

# --------------------------------------------------------------------------
# SES Email Identities
# --------------------------------------------------------------------------

resource "aws_ses_email_identity" "noreply" {
  email = var.sender_email
}

resource "aws_ses_email_identity" "admin" {
  email = "admin@involvedtalent.com"
}

resource "aws_ses_email_identity" "support" {
  email = "support@involvedtalent.com"
}

# --------------------------------------------------------------------------
# Legacy: IAM User for SMTP fallback (us-east-1 SMTP credentials)
# These are used as fallback when OIDC is not available
# --------------------------------------------------------------------------

resource "aws_iam_user" "ses_smtp_user" {
  name = "ses-smtp-involvedtalent"
  tags = var.tags
}

resource "aws_iam_user_policy" "ses_smtp_send" {
  name = "AmazonSesSendingAccess"
  user = aws_iam_user.ses_smtp_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ses:SendRawEmail"
        Resource = "*"
      }
    ]
  })
}
