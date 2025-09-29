# LinkedIn Playwright MCP Server

A Model Context Protocol (MCP) server that provides LinkedIn automation tools using Playwright. This server enables authentication management and post searching capabilities for LinkedIn through a clean functional API.

## Features

- **System-wide Authentication**: Stores LinkedIn credentials in your system directory for reuse across sessions
- **Interactive Authentication**: Handles complex login flows including 2FA
- **Post Search**: Search LinkedIn posts with keywords and pagination
- **Functional Architecture**: Clean, testable functions without class boilerplate

## Available MCP Tools

### 1. `linkedin_authenticate`
Launch LinkedIn authentication flow and save credentials for future use.

**Parameters:**
- `force_reauth` (boolean, optional): Force new authentication even if valid credentials exist

### 2. `linkedin_auth_status`
Check current LinkedIn authentication status and credential information.

### 3. `linkedin_clear_auth`
Clear stored LinkedIn authentication credentials.

### 4. `linkedin_search_posts`
Search LinkedIn posts with keywords and optional pagination.

**Parameters:**
- `keywords` (string, required): Search keywords or query (e.g., 'machine learning', '"AI engineer"')
- `pagination` (number, optional): Number of scroll pages to load more results (default: 3, max: 10)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Usage

### As an MCP Server

1. Add to your MCP client configuration (e.g., Claude Desktop):
```json
{
  "mcpServers": {
    "linkedin-playwright": {
      "command": "node",
      "args": ["/path/to/linkedin-playwright-mcp/build/index.js"]
    }
  }
}
```

2. The server will be available with all four tools listed above.

### Development

Run in development mode:
```bash
npm run dev
```

Type checking:
```bash
npm run typecheck
```

## Authentication Storage

Authentication credentials are stored system-wide:
- **Windows**: `%APPDATA%/linkedin-mcp/auth.json`
- **macOS/Linux**: `~/.linkedin-mcp/auth.json`

This ensures credentials persist across different projects and sessions.

## Architecture

The project uses a functional architecture with the following structure:

```
src/
├── auth/
│   ├── storage.ts       # Auth data persistence functions
│   └── browser.ts       # Browser automation functions
├── tools/
│   ├── authenticate.ts  # Authentication MCP tool
│   └── search-posts.ts  # Search posts MCP tool
├── utils/
│   └── paths.ts         # System path utilities
└── index.ts             # Main MCP server
```

## Legacy Scripts

The original standalone scripts are still available:
- `npm run auth:login` - Run original auth login script
- `npm run auth:run` - Run with existing auth (if available)

## Requirements

- Node.js 18+
- Playwright (automatically installs browsers)
- TypeScript 5+

## License

ISC
