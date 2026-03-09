resource "google_artifact_registry_repository" "mcp" {
  repository_id = "mcp"
  format        = "DOCKER"
  location      = var.region
  description   = "Docker images for MCP servers"
}
