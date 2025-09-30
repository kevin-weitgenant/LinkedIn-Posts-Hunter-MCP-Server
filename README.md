# LinkedIn Playwright MCP Server

A Model Context Protocol (MCP) server that provides LinkedIn automation tools using Playwright. This server enables authentication management, post searching, and a web-based post viewer for managing search results stored in a SQLite database.

## Features

- **System-wide Authentication**: Stores LinkedIn credentials in your system directory for reuse across sessions
- **Interactive Authentication**: Handles complex login flows including 2FA
- **Post Search**: Search LinkedIn posts with keywords and pagination
- **Post Viewer & Editor**: Web-based interface with live reload to view and edit search results from database
- **MCP Resources**: Access search results as MCP resources for easy integration
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

**Output:**
- Results are automatically saved as CSV files in `~/.linkedin-mcp/resources/searches/`
- Each search creates a timestamped CSV file with post data

### 5. `start_post_viewer`
Start a web-based post viewer and editor for LinkedIn search results with live reload functionality.

**Features:**
- View all LinkedIn posts from the database
- View and edit post data in a user-friendly table interface
- Live reload: automatically refreshes when database changes
- Edit cells directly in the browser
- Save changes back to the database
- Opens automatically in your default browser at `http://localhost:4327`

## MCP Resources

This server exposes LinkedIn search results as MCP resources that can be accessed by MCP clients:

- **Resource Template**: `file:///.linkedin-mcp/resources/searches/{filename}`
- **MIME Type**: `text/csv` (legacy format - database is primary storage)
- **Location**: Search results are stored in SQLite database at `~/.linkedin-mcp/resources/linkedin.db`

Use the resource listing feature in your MCP client to browse available search results.

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

2. The server will be available with all five tools and resource access.

### Packaging as Binary (Optional)

Package the server as a standalone binary:

```bash
npm run mcpb
```

This creates a `linkedin-playwright-mcp.mcpb` file that can be distributed and used without Node.js installation.

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

## Search Results Storage

LinkedIn search results are saved in a SQLite database:
- **Windows**: `%APPDATA%/linkedin-mcp/resources/linkedin.db`
- **macOS/Linux**: `~/.linkedin-mcp/resources/linkedin.db`

Results include post content, links, descriptions, screenshots, and search metadata.

## Architecture

The project uses a functional architecture with the following structure:

```
src/
├── auth/
│   ├── storage.ts       # Auth data persistence functions
│   └── browser.ts       # Browser automation functions
├── tools/
│   ├── authenticate.ts  # Authentication MCP tool
│   ├── search-posts.ts  # Search posts MCP tool
│   ├── post-manager.ts  # Post management MCP tool
│   └── start-post-viewer/
│       ├── index.ts     # Post viewer server
│       ├── types.ts     # TypeScript types
│       ├── constants.ts # Configuration constants
│       └── util.ts      # Utility functions
├── server/
│   └── static/         # Static files for post viewer web UI
│       ├── index.html
│       ├── styles.css
│       ├── app.js      # Main application logic
│       ├── ui.js       # UI rendering
│       ├── gallery.js  # Screenshot gallery
│       ├── api.js      # API client
│       └── state.js    # State management
├── utils/
│   ├── paths.ts             # System path utilities
│   └── resource-storage.ts  # MCP resource management
└── index.ts                 # Main MCP server
```

## Workflow Example

1. **Authenticate**: Use `linkedin_authenticate` to log in to LinkedIn
2. **Search**: Use `linkedin_search_posts` to find relevant posts (results saved to database)
3. **Manage**: Use `linkedin_manage_posts` to read, update, or delete specific posts
4. **View/Edit**: Use `start_post_viewer` to open the web interface and review/edit results
5. **Access as Resource**: Use MCP resource features to access data programmatically

## Legacy Scripts

The original standalone scripts are still available:
- `npm run auth:login` - Run original auth login script
- `npm run auth:run` - Run with existing auth (if available)

## Requirements

- Node.js 18+
- Playwright (automatically installs browsers)
- TypeScript 5+

## Troubleshooting

### Post Viewer Not Opening
- Ensure port 4327 is not in use by another application
- Manually visit `http://localhost:4327` in your browser
- Check that the database exists and contains posts

### Authentication Issues
- Use `force_reauth: true` parameter to re-authenticate
- Check system auth file permissions
- Clear auth with `linkedin_clear_auth` and try again

### Search Not Returning Results
- Verify you're authenticated first with `linkedin_auth_status`
- Try different search keywords
- LinkedIn may rate-limit automated searches

## License

ISC