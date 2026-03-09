resource "google_secret_manager_secret" "twenty_api_token" {
  secret_id = "twenty-api-token"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "mcp_auth_token" {
  secret_id = "mcp-auth-token"
  replication {
    auto {}
  }
}
