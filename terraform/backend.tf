terraform {
  backend "gcs" {
    bucket = "decodedata-crm"
    prefix = "terraform/mcp"
  }
}
