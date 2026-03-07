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

## Available Tools

### `inspect_schema`
Lists all objects and fields in your workspace, including custom fields.

### `execute_graphql`
Run any raw GraphQL query or mutation against Twenty.

**Parameters:**
- `query` (string, required): The GraphQL query or mutation
- `variables` (object, optional): Variables for the query

### `update_record`
Update a record with automatic composite field handling.

**Parameters:**
- `objectName` (string): e.g. `person` or `company`
- `id` (string): UUID of the record
- `data` (object): Fields to update

Composite fields are handled automatically — pass `emails` as a plain string and it will be wrapped into `{ primaryEmail, additionalEmails }`.
