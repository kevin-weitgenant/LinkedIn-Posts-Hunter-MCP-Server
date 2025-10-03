#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { handleLinkedInAuth } from './tools/authenticate.js';
import { handleLinkedInSearchPosts } from './tools/search-posts/mcp-handler.js';
import { handleLinkedInManagePosts } from './tools/posts-manager.js';
import { handleLinkedInManageFilters } from './tools/filter-manager.js';
import { startViteViewer, stopViteViewer } from './tools/start-server.js';
import { closeDatabase } from './db/database.js';

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
        name: "auth",
        description: "Manage LinkedIn authentication: authenticate, check status, or clear credentials",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["authenticate", "status", "clear"],
              description: "Action to perform: 'authenticate' to log in, 'status' to check credentials, 'clear' to remove credentials"
            },
            force_reauth: {
              type: "boolean",
              description: "Force new authentication even if valid credentials exist (only used with 'authenticate' action)",
              default: false
            }
          },
          required: ["action"]
        },
      },
      {
        name: "search_posts",
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
              description: "Number of scroll pages to load more results)",
              default: 2,
              minimum: 1,
              maximum: 10
            },
            headless: {
              type: "boolean",
              description: "Run browser in headless mode (default: false). Headless mode is faster and uses less resources. ",
              default: false
            }
          },
          required: ["keywords"]
        },
      },
      {
        name: "manage_posts",
        description: "Query and manage LinkedIn posts. Focused on keywords + descriptions. Process in small batches to manage context efficiently.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["read", "delete", "count"],
              description: "read: get posts with full descriptions | delete: remove posts | count: get totals with filters"
            },
            keyword: {
              type: "string",
              description: "Filter by LinkedIn search keyword column (e.g., 'python engineer', 'backend developer')"
            },
            contains: {
              type: "string",
              description: "Search for text within post descriptions (e.g., 'remote', '$150k', 'healthcare benefits')"
            },
            ids: {
              type: "array",
              items: { type: "number" },
              description: "Specific post IDs to read or delete"
            },
            limit: {
              type: "number",
              description: "How many posts to return (default: 5, max: 20). Use small batches to manage context.",
              default: 5,
              minimum: 1,
              maximum: 20
            },
            offset: {
              type: "number",
              description: "Skip first N posts for pagination (default: 0). Use with limit to process posts in batches.",
              default: 0,
              minimum: 0
            },
            applied: {
              type: "boolean",
              description: "Filter by applied status: true for applied, false for not applied"
            },
            saved: {
              type: "boolean",
              description: "Filter by saved status: true for saved, false for not saved"
            }
          },
          required: ["action"]
        },
      },
      {
        name: "start_viewer",
        description: "Start post viewer (React dashboard with hot reload)",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
      },
      {
        name: "stop_viewer",
        description: "Stop the running viewer server",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
      },
      {
        name: "viewer_filters",
        description: "Read or update the LinkedIn post viewer filters. Filter state syncs between MCP and the React viewer UI.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["read", "update"],
              description: "Action to perform: 'read' to get current filter state, 'update' to change filters"
            },
            keyword: {
              type: "string",
              description: "Filter by specific keyword (empty string for 'All Keywords') - only for update action"
            },
            applied_status: {
              type: "string",
              enum: ["all", "applied", "not-applied"],
              description: "Filter by application status: 'all' (default), 'applied', or 'not-applied' - only for update action"
            },
            start_date: {
              type: "string",
              description: "Filter posts from this date onwards (ISO format: YYYY-MM-DD, e.g., '2024-01-15') - only for update action"
            },
            end_date: {
              type: "string",
              description: "Filter posts up to this date (ISO format: YYYY-MM-DD, e.g., '2024-12-31') - only for update action"
            },
            ids: {
              type: "string",
              description: "Filter by specific post IDs, comma-separated (e.g., '1,5,10') - only for update action"
            },
            reset: {
              type: "boolean",
              description: "If true, reset all filters to default state (clears all filters) - only for update action"
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
      case "auth":
        return await handleLinkedInAuth(params as any);
        
      case "search_posts":
        return await handleLinkedInSearchPosts(params as any);
        
      case "manage_posts":
        return await handleLinkedInManagePosts(params as any);
        
      case "start_viewer":
        const viteResult = await startViteViewer();
        return {
          content: [{
            type: "text",
            text: `Viewer started successfully!\n\n${viteResult.message}\n\nThe browser should have opened automatically. If not, visit: ${viteResult.url}\n\nHot reload is enabled!`
          }]
        };
        
      case "stop_viewer":
        const stopResult = stopViteViewer();
        return {
          content: [{
            type: "text",
            text: stopResult.message
          }]
        };
        
      case "viewer_filters":
        return await handleLinkedInManageFilters(params as any);
        
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

// Graceful shutdown handlers
// Ensures proper cleanup of resources when the MCP server stops
const cleanup = async () => {
  try {
    // Close database connection and save any pending changes
    closeDatabase();
    
    // Stop any running Vite viewer servers
    stopViteViewer();
  } catch (error) {
    // Silently handle cleanup errors to avoid protocol corruption
  }
  
  process.exit(0);
};

// Handle termination signals
process.on('SIGTERM', cleanup);  // Docker/systemd termination
process.on('SIGINT', cleanup);   // Ctrl+C in terminal

// Handle normal process exit
process.on('exit', () => {
  // Final cleanup - must be synchronous
  try {
    closeDatabase();
  } catch (error) {
    // Ignore errors during final cleanup
  }
});

// Global error handlers to prevent crashes
// These catch unhandled errors that could otherwise crash the MCP server
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // Log to stderr (not stdout, to avoid corrupting MCP protocol)
  // Don't crash the server - just handle the error gracefully
  try {
    closeDatabase(); // Ensure DB is saved
  } catch (error) {
    // Ignore cleanup errors
  }
});

process.on('uncaughtException', (error: Error) => {
  // Critical error - attempt cleanup and exit gracefully
  try {
    closeDatabase();
    stopViteViewer();
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
  
  // Exit with error code
  process.exit(1);
});
