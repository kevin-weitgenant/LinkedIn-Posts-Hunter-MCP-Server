import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { 
  handleLinkedInAuthenticate, 
  handleLinkedInAuthStatus,
  handleLinkedInClearAuth 
} from './tools/authenticate.js';
import { handleLinkedInSearchPosts } from './tools/search-posts.js';
import { startCsvViewer } from './tools/start-csv-viewer.js';
import { listSearchResources, readSearchResource } from './utils/resource-storage.js';

// Initialize MCP server
const server = new Server(
  {
    name: "linkedin-playwright-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
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
      }
    ],
  };
});

// List available resource templates
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: "file:///.linkedin-mcp/resources/searches/{filename}",
        name: "LinkedIn Search Results",
        description: "CSV files containing LinkedIn post search results",
        mimeType: "text/csv"
      }
    ]
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const searchResources = await listSearchResources();
  
  return {
    resources: searchResources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))
  };
});

// Read specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  // Extract filename from URI
  const filename = uri.split('/').pop();
  if (!filename) {
    throw new Error('Invalid resource URI');
  }
  
  const content = await readSearchResource(filename);
  if (content === null) {
    throw new Error('Resource not found');
  }
  
  return {
    contents: [
      {
        uri: uri,
        mimeType: "text/csv",
        text: content
      }
    ]
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

console.error("LinkedIn Playwright MCP Server running...");
