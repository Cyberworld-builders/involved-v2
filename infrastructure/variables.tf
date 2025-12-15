variable "aws_region" {
  description = "AWS region for SES resources"
  type        = string
  default     = "us-east-1"
}

variable "sender_email" {
  description = "Email address to use as sender (must be verified in SES)"
  type        = string
  default     = "jay@cyberworldbuilders.com"
}

variable "sender_name" {
  description = "Display name for email sender"
  type        = string
  default     = "Involved Talent"
}

variable "iam_user_name" {
  description = "Name for the IAM user that will have SES permissions"
  type        = string
  default     = "involved-v2-ses-user"
}

variable "domain_name" {
  description = "Domain name to verify in SES (optional, leave empty to only verify email)"
  type        = string
  default     = ""
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
