variable "project" {
  description = "GCP project ID"
  type        = string
  default     = "decodedata-crm"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west2"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "twentycrm-mcp"
}

variable "image" {
  description = "Docker image URL (e.g. europe-west2-docker.pkg.dev/decodedata-crm/mcp/twentycrm-graphql-mcp:latest)"
  type        = string
}

variable "twenty_gql_url" {
  description = "Twenty CRM GraphQL endpoint URL"
  type        = string
}
