import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

export function createServer() {
  const server = new Server(
    { name: "twentycrm-graphql-mcp", version: "0.0.9" },
    { capabilities: { tools: {} } }
  );

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
        name: "execute_metadata",
        description: "Run any raw GraphQL query or mutation against the Twenty Metadata API (schema management: custom objects, fields, relations).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The GraphQL query or mutation string" },
            variables: { type: "object", description: "Optional variables for the query" },
          },
          required: ["query"],
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
          try {
            const result = await queryTwenty(typedArgs.query, typedArgs.variables);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("duplicate entry")) {
              const objectMatch = typedArgs.query.match(/create(?:One)?(\w+)\s*[({]/i);
              if (objectMatch) {
                const objectType = objectMatch[1];
                const pluralType = objectType.endsWith("s") ? `${objectType}es` : `${objectType}s`;
                try {
                  const deleted = await queryTwenty(
                    `query { ${pluralType.charAt(0).toLowerCase() + pluralType.slice(1)}(filter: { deletedAt: { is: NOT_NULL } }) { edges { node { id } } } }`
                  );
                  const deletedIds = deleted?.data?.[pluralType.charAt(0).toLowerCase() + pluralType.slice(1)]?.edges?.map((e: { node: { id: string } }) => e.node.id) ?? [];
                  const hint = deletedIds.length > 0
                    ? ` Soft-deleted ${objectType} IDs that may be conflicting: ${deletedIds.join(", ")}. Use destroyCompany/destroyPerson etc. to permanently remove before recreating.`
                    : "";
                  throw new Error(`${message}.${hint}`);
                } catch (innerError: unknown) {
                  const innerMessage = innerError instanceof Error ? innerError.message : String(innerError);
                  if (innerMessage.includes("duplicate entry")) throw innerError;
                  throw new Error(`${message}. Note: there may be a soft-deleted record with the same unique field — use destroy before recreating.`);
                }
              }
            }
            throw error;
          }
        }

        case "execute_metadata": {
          const typedArgs = args as { query: string; variables?: Record<string, unknown> };
          const result = await queryTwenty(typedArgs.query, typedArgs.variables, METADATA_URL);
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

  return server;
}
