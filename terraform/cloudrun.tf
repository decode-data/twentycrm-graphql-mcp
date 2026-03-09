resource "google_cloud_run_v2_service" "mcp" {
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.mcp.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      env {
        name  = "TWENTY_GQL_URL"
        value = var.twenty_gql_url
      }

      env {
        name = "TWENTY_API_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.twenty_api_token.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.mcp_reads_twenty_token,
  ]
}
