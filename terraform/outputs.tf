output "service_url" {
  description = "Public URL of the MCP Cloud Run service"
  value       = google_cloud_run_v2_service.mcp.uri
}

output "image_repo" {
  description = "Artifact Registry repo to push Docker images to"
  value       = "${var.region}-docker.pkg.dev/${var.project}/${google_artifact_registry_repository.mcp.repository_id}"
}
