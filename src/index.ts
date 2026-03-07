#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const GQL_URL = process.env.TWENTY_GQL_URL || "https://api.twenty.com/graphql";
const METADATA_URL = GQL_URL.replace(/\/graphql$/, "/metadata");
const API_TOKEN = process.env.TWENTY_API_TOKEN;

if (!API_TOKEN) {
  console.error("Warning: TWENTY_API_TOKEN environment variable is not set.");
}

const server = new Server(
  {
    name: "twentycrm-graphql-mcp",
    version: "0.0.4",
  },
  {
    capabilities: { tools: {} },
  }
);

async function queryTwenty(query: string, variables: Record<string, unknown> = {}, url = GQL_URL) {
  try {
    const response = await axios.post(
      url,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.errors?.[0]?.message || error.message
      );
    }
    throw error;
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "inspect_schema",
      description:
        "Lists all available objects and fields, including CUSTOM fields created in your workspace.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "execute_graphql",
      description: "Run any raw GraphQL query or mutation against Twenty.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The GraphQL query or mutation string" },
          variables: { type: "object", description: "Optional variables for the query" },
        },
        required: ["query"],
      },
    },
    {
      name: "update_record",
      description:
        "Updates a record. Automatically handles composite fields like emails and links.",
      inputSchema: {
        type: "object",
        properties: {
          objectName: {
            type: "string",
            description: "e.g., 'person' or 'company'",
          },
          id: { type: "string", format: "uuid" },
          data: { type: "object", description: "Fields to update" },
        },
        required: ["objectName", "id", "data"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "inspect_schema": {
        const query = `
          query {
            objects {
              edges {
                node {
                  nameSingular
                  namePlural
                  fields {
                    edges {
                      node {
                        name
                        type
                        isCustom
                      }
                    }
                  }
                }
              }
            }
          }`;
        const result = await queryTwenty(query, {}, METADATA_URL);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "execute_graphql": {
        const typedArgs = args as { query: string; variables?: Record<string, unknown> };
        const result = await queryTwenty(typedArgs.query, typedArgs.variables);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "update_record": {
        const { objectName, id, data } = args as {
          objectName: string;
          id: string;
          data: Record<string, unknown>;
        };
        const formattedData = { ...data };

        // Smart wrapping: handle Twenty composite field types
        if (typeof formattedData.emails === "string") {
          formattedData.emails = {
            primaryEmail: formattedData.emails,
            additionalEmails: [],
          };
        }
        if (typeof formattedData.domainName === "string") {
          formattedData.domainName = { primaryLinkUrl: formattedData.domainName };
        }

        const capitalized =
          objectName.charAt(0).toUpperCase() + objectName.slice(1);
        const mutation = `
          mutation Update${capitalized}($id: UUID!, $data: ${capitalized}UpdateInput!) {
            update${capitalized}(id: $id, data: $data) {
              id
            }
          }`;

        const result = await queryTwenty(mutation, { id, data: formattedData });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
