variable "aws_region" {
  description = "AWS region for SES resources (production access granted in us-east-2)"
  type        = string
  default     = "us-east-2"
}

variable "sender_email" {
  description = "Primary sender email address (verified in SES)"
  type        = string
  default     = "noreply@involvedtalent.com"
}

variable "sender_name" {
  description = "Display name for email sender"
  type        = string
  default     = "Involved Talent"
}

variable "iam_role_name" {
  description = "Name of the IAM role for Vercel OIDC → SES access"
  type        = string
  default     = "talent-assessment-vercel-ses-role"
}

variable "vercel_team_staging" {
  description = "Vercel team slug for the staging project (Jay's)"
  type        = string
  default     = "jaylong255s-projects"
}

variable "vercel_team_production" {
  description = "Vercel team slug for the production project (Involved Talent)"
  type        = string
  default     = "involved-talent"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "involved-v2"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
