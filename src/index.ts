import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { 
  handleLinkedInAuthenticate, 
  handleLinkedInAuthStatus,
  handleLinkedInClearAuth 
} from './tools/authenticate.js';
import { handleLinkedInSearchPosts } from './tools/search-posts.js';
import { handleLinkedInManageCsv } from './tools/csv-manager.js';
import { startCsvViewer } from './tools/start-csv-viewer/index.js';

// Initialize MCP server
const server = new Server(
  {
    name: "linkedin-playwright-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "linkedin_authenticate",
        description: "Launch LinkedIn authentication flow and save credentials for future use",
        inputSchema: {
          type: "object",
          properties: {
            force_reauth: {
              type: "boolean",
              description: "Force new authentication even if valid credentials exist",
              default: false
            }
          }
        },
      },
      {
        name: "linkedin_auth_status", 
        description: "Check current LinkedIn authentication status and credential information",
        inputSchema: {
          type: "object",
          properties: {}
        },
      },
      {
        name: "linkedin_clear_auth",
        description: "Clear stored LinkedIn authentication credentials",
        inputSchema: {
          type: "object", 
          properties: {}
        },
      },
      {
        name: "linkedin_search_posts",
        description: "Search LinkedIn posts with keywords and optional pagination",
        inputSchema: {
          type: "object",
          properties: {
            keywords: {
              type: "string",
              description: "Search keywords or query (e.g., 'machine learning', '\"AI engineer\"')"
            },
            pagination: {
              type: "number",
              description: "Number of scroll pages to load more results (default: 3, max recommended: 10)",
              default: 3,
              minimum: 1,
              maximum: 10
            }
          },
          required: ["keywords"]
        },
      },
      {
        name: "start_csv_viewer",
        description: "Start a web-based CSV viewer and editor for LinkedIn search results with live reload functionality",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
      },
      {
        name: "linkedin_manage_csv",
        description: "Read, update, or delete posts from the LinkedIn database. Filters by ID, keywords, content, or date range. Only returns matching entries to minimize context.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["read", "update", "delete"],
              description: "Action to perform: 'read' to query entries, 'update' to modify entries, 'delete' to remove entries"
            },
            ids: {
              type: "array",
              items: { type: "number" },
              description: "Filter by specific entry IDs (e.g., [1, 5, 10])"
            },
            search_text: {
              type: "string",
              description: "Search text to match in keywords or description fields"
            },
            date_from: {
              type: "string",
              description: "Filter entries from this date (ISO format: YYYY-MM-DD)"
            },
            date_to: {
              type: "string",
              description: "Filter entries until this date (ISO format: YYYY-MM-DD)"
            },
            limit: {
              type: "number",
              description: "Maximum number of entries to return (default: 10, max: 50)",
              default: 10,
              minimum: 1,
              maximum: 50
            },
            new_description: {
              type: "string",
              description: "New description text (for update action only)"
            },
            new_keywords: {
              type: "string",
              description: "New keywords text (for update action only)"
            }
          },
          required: ["action"]
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: params } = request.params;

  try {
    switch (name) {
      case "linkedin_authenticate":
        return await handleLinkedInAuthenticate(params as any);
        
      case "linkedin_auth_status":
        return await handleLinkedInAuthStatus(params as any);
        
      case "linkedin_clear_auth":
        return await handleLinkedInClearAuth();
        
      case "linkedin_search_posts":
        return await handleLinkedInSearchPosts(params as any);
        
      case "start_csv_viewer":
        const result = await startCsvViewer();
        return {
          content: [{
            type: "text",
            text: `CSV Viewer started successfully!\n\n${result.message}\n\nThe browser should have opened automatically. If not, visit: ${result.url}`
          }]
        };
        
      case "linkedin_manage_csv":
        return await handleLinkedInManageCsv(params as any);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

// MCP servers communicate via JSON-RPC over stdin/stdout
// Do not write anything to stdout or it will corrupt the protocol
