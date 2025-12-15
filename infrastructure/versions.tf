terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Configure remote state backend
  # Uncomment and configure if using remote state (S3, Terraform Cloud, etc.)
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "involved-v2/ses/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
