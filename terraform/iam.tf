resource "google_service_account" "mcp" {
  account_id   = "twentycrm-mcp"
  display_name = "Twenty CRM MCP Server"
  description  = "Service account for the Twenty CRM MCP Cloud Run service"
}

# Allow the service account to read secrets
resource "google_secret_manager_secret_iam_member" "mcp_reads_twenty_token" {
  secret_id = google_secret_manager_secret.twenty_api_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.mcp.email}"
}

resource "google_secret_manager_secret_iam_member" "mcp_reads_auth_token" {
  secret_id = google_secret_manager_secret.mcp_auth_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.mcp.email}"
}

# Allow unauthenticated access — the app enforces its own bearer token auth
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.mcp.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
