# twentycrm-graphql-mcp

An MCP (Model Context Protocol) server for [Twenty CRM](https://twenty.com) that exposes GraphQL tools to AI assistants.

## Usage

Run directly with npx (no install required):

```bash
TWENTY_API_TOKEN=your_token npx twentycrm-graphql-mcp
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TWENTY_API_TOKEN` | Yes | Your Twenty API token (Settings > API & Webhooks) |
| `TWENTY_GQL_URL` | No | Your Twenty instance's GraphQL endpoint. For cloud-hosted, it's `https://[your-org].twenty.com/graphql`. For self-hosted, it's `https://[your-domain]/graphql`. |

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "twentycrm": {
      "command": "npx",
      "args": ["-y", "twentycrm-graphql-mcp"],
      "env": {
        "TWENTY_API_TOKEN": "your_token_here",
        "TWENTY_GQL_URL": "https://your-instance.com/graphql"
      }
    }
  }
}
```

## Deploying to Google Cloud Run

> **Note:** This deployment is not currently active. The recommended way to use this package is via `npx` as described above.

The `terraform/` directory contains infrastructure-as-code to deploy this as a hosted MCP server on Cloud Run (GCP project `decodedata-crm`, region `europe-west2`).

### Prerequisites

- Terraform >= 1.5
- `gcloud` CLI authenticated with the `decodedata-crm` project
- Docker

### Resources created

| Resource | Description |
|---|---|
| Artifact Registry repo | `europe-west2-docker.pkg.dev/decodedata-crm/mcp/` |
| Cloud Run service | `twentycrm-mcp` — publicly accessible, auth enforced by app |
| Secret Manager secrets | `twenty-api-token`, `mcp-auth-token` |
| Service account | `twentycrm-mcp@decodedata-crm.iam.gserviceaccount.com` |

### Deploy

```bash
# 1. Build and push the Docker image
gcloud auth configure-docker europe-west2-docker.pkg.dev

IMAGE=europe-west2-docker.pkg.dev/decodedata-crm/mcp/twentycrm-graphql-mcp:latest
docker build -t $IMAGE .
docker push $IMAGE

# 2. Apply infrastructure
cd terraform
terraform init
terraform apply \
  -var="image=europe-west2-docker.pkg.dev/decodedata-crm/mcp/twentycrm-graphql-mcp:latest" \
  -var="twenty_gql_url=https://crm.decodedata.io/graphql"
```

### Secrets

After first apply, populate the secrets in GCP Secret Manager:

```bash
# Twenty API token (from Twenty Settings > API & Webhooks)
echo -n "your-twenty-api-token" | gcloud secrets versions add twenty-api-token --data-file=-

# MCP bearer token (any strong random string — required by clients to call the service)
echo -n "your-mcp-auth-token" | gcloud secrets versions add mcp-auth-token --data-file=-
```

### Destroy

```bash
cd terraform
terraform destroy \
  -var="image=europe-west2-docker.pkg.dev/decodedata-crm/mcp/twentycrm-graphql-mcp:latest" \
  -var="twenty_gql_url=https://crm.decodedata.io/graphql"
```

### HTTP server

When deployed, the service exposes:

- `GET /sse` — SSE endpoint for MCP clients (requires `Authorization: Bearer <mcp-auth-token>`)
- `POST /messages` — MCP message endpoint
- `GET /health` — Health check (unauthenticated)

## Available Tools

### `inspect_schema`
Lists all objects and fields in your workspace, including custom fields.

### `execute_graphql`
Run any raw GraphQL query or mutation against Twenty.

**Parameters:**
- `query` (string, required): The GraphQL query or mutation
- `variables` (object, optional): Variables for the query

### `execute_metadata`
Run any raw GraphQL query or mutation against the Twenty Metadata API (schema management: custom objects, fields, relations).

**Parameters:**
- `query` (string, required): The GraphQL query or mutation
- `variables` (object, optional): Variables for the query

