<div align="center">
  <img src="saitama-job-hunting.png" alt="Saitama Job Hunting" width="300"/>
  
  # LinkedIn Playwright MCP Server
  
  **Automate LinkedIn job post searching and tracking with AI-powered assistance**
  
  [![MCP](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![Playwright](https://img.shields.io/badge/Playwright-1.55-green)](https://playwright.dev/)
  
</div>

---

## 📖 Overview

**LinkedIn Playwright MCP** is a Model Context Protocol (MCP) server that brings LinkedIn job search automation directly into your AI assistant conversations. It uses Playwright to interact with LinkedIn, search for posts, track applications, and manage your job hunt all through natural language commands in Claude or other MCP-compatible AI assistants.

### Why is this useful?

- **AI-Powered Job Search**: Ask Claude to search LinkedIn for specific job opportunities
- **Automated Tracking**: Keep track of which posts you've applied to with a built-in SQLite database
- **Visual Interface**: Launch a beautiful React dashboard to browse and filter saved posts
- **Persistent Sessions**: Save your LinkedIn authentication for seamless repeated use
- **Natural Language Control**: Manage your job search through conversation with your AI assistant

---

## 🏗️ Architecture

The project is built with a modular architecture:

```
linkedin-playwright-mcp/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── auth/                       # LinkedIn authentication with Playwright
│   │   ├── browser.ts              # Headless browser automation
│   │   └── storage.ts              # Secure credential storage
│   ├── db/                         # SQLite database layer
│   │   ├── database.ts             # Database initialization & schema
│   │   └── operations.ts           # CRUD operations for posts
│   ├── tools/                      # MCP tool implementations
│   │   ├── authenticate.ts         # LinkedIn auth tool
│   │   ├── search-posts/           # Post search functionality
│   │   │   ├── core/search.ts      # Main search logic
│   │   │   ├── extractors/         # Content & metadata extraction
│   │   │   └── mcp-handler.ts      # MCP integration
│   │   ├── posts-manager.ts        # Database management tool
│   │   ├── filter-manager.ts       # Filter control for UI
│   │   └── start-server.ts         # Vite dev server launcher
│   ├── client-vite/                # React + TypeScript UI
│   │   ├── src/
│   │   │   ├── App.tsx             # Main React app
│   │   │   └── components/         # UI components
│   │   │       ├── FilterView.tsx  # Filter sidebar
│   │   │       ├── TableView.tsx   # Posts table
│   │   │       └── LinkedInPostCard.tsx # Post cards
│   │   └── dist/                   # Built static assets
│   └── utils/                      # Shared utilities
└── build/                          # Compiled JavaScript output
```

### Key Components

1. **MCP Server** (`src/index.ts`): Registers and handles all tool calls from the AI assistant
2. **Playwright Automation** (`src/auth/`, `src/tools/search-posts/`): Automates LinkedIn interactions
3. **SQLite Database** (`src/db/`): Stores searched posts with metadata (author, dates, engagement metrics)
4. **React Dashboard** (`src/client-vite/`): Visual interface for browsing and filtering posts
5. **Express API** (`src/tools/server-api/`): Serves the React app and provides REST endpoints

---

## 🛠️ Available Tools

This MCP server exposes **6 tools** that can be called from your AI assistant:

### 1. `linkedin_auth`
Manage LinkedIn authentication with persistent session storage.

**Parameters:**
- `action`: `"authenticate"` | `"status"` | `"clear"`
- `force_reauth`: boolean (optional)

**Usage:**
```
"Authenticate my LinkedIn account"
"Check LinkedIn auth status"
"Clear my LinkedIn credentials"
```

### 2. `linkedin_search_posts`
Search LinkedIn posts by keywords and save results to the database.

**Parameters:**
- `keywords`: string (e.g., "Python developer remote")
- `pagination`: number (1-10, default: 3)

**Usage:**
```
"Search LinkedIn for 'AI engineer' jobs"
"Find posts about 'React developer' with 5 pages"
```

### 3. `linkedin_manage_posts`
Read, update, or delete posts from the database with advanced filtering.

**Parameters:**
- `action`: `"read"` | `"update"` | `"delete"`
- `ids`: number[] (optional)
- `search_text`: string (optional)
- `date_from`: string (YYYY-MM-DD, optional)
- `date_to`: string (YYYY-MM-DD, optional)
- `applied`: boolean (optional)
- `limit`: number (1-50, default: 10)
- `new_description`: string (for updates)
- `new_keywords`: string (for updates)
- `new_applied`: boolean (for updates)

**Usage:**
```
"Show me posts I haven't applied to yet"
"Mark post ID 42 as applied"
"Delete all posts older than January 1st"
```

### 4. `linkedin_set_filters`
Control the React UI filters programmatically from the AI conversation.

**Parameters:**
- `keyword`: string (optional)
- `applied_status`: `"all"` | `"applied"` | `"not-applied"` (optional)
- `start_date`: string (YYYY-MM-DD, optional)
- `end_date`: string (YYYY-MM-DD, optional)
- `ids`: string (comma-separated, optional)
- `reset`: boolean (optional)

**Usage:**
```
"Filter to show only unapplied posts"
"Show posts from this week"
"Reset all filters"
```

### 5. `start_vite_viewer`
Launch the React dashboard in your browser with hot reload enabled.

**Usage:**
```
"Open the LinkedIn post viewer"
"Start the dashboard"
```

### 6. `stop_vite_viewer`
Stop the running Vite development server.

**Usage:**
```
"Close the viewer"
"Stop the dashboard"
```

---

## 📦 Installation

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- A LinkedIn account
- **Cursor IDE** (for mcp.json method) or **Claude Desktop** (for .mcpb method)

### Method 1: Using the Pre-built .mcpb Package

The easiest way to install is using the pre-built MCP bundle:

1. **Download or clone this repository:**
   ```bash
   git clone https://github.com/yourusername/linkedin-playwright-mcp.git
   cd linkedin-playwright-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```
   This installs dependencies for both the main server and the React client.

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Create the .mcpb package:**
   ```bash
   npm run pack
   ```
   This generates `linkedin-playwright-mcp.mcpb` in the project root.

5. **Install the package in Claude Desktop:**
   - Double-click the `.mcpb` file, or
   - Drag it onto the Claude Desktop app, or
   - Use the Claude Desktop settings to add the package manually

### Method 2: Using mcp.json in Cursor IDE

For development or if you're using Cursor IDE:

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/yourusername/linkedin-playwright-mcp.git
   cd linkedin-playwright-mcp
   npm run install:all
   npm run build
   ```

2. **Locate or create your MCP configuration file:**
   
   - **On macOS/Linux:**
     ```bash
     mkdir -p ~/Library/Application\ Support/Cursor/User/globalStorage/
     code ~/Library/Application\ Support/Cursor/User/globalStorage/mcp.json
     ```
   
   - **On Windows:**
     ```powershell
     mkdir -Force "$env:APPDATA\Cursor\User\globalStorage"
     notepad "$env:APPDATA\Cursor\User\globalStorage\mcp.json"
     ```

3. **Add the server configuration to `mcp.json`:**
   ```json
   {
     "mcpServers": {
       "linkedin-playwright-mcp": {
         "command": "node",
         "args": [
           "F:/projects/linkedin/linkedin-playwright-mcp/build/index.js"
         ],
         "cwd": "F:/projects/linkedin/linkedin-playwright-mcp"
       }
     }
   }
   ```
   
   **⚠️ Important:** Replace `F:/projects/linkedin/linkedin-playwright-mcp` with your actual project path.

4. **Restart Cursor** to load the MCP server.

---

## 🚀 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the MCP server in development mode with tsx |
| `npm run build` | Clean, compile TypeScript, build React client, and copy assets |
| `npm run clean` | Remove the `build/` directory |
| `npm run build-client` | Build the React dashboard (production mode) |
| `npm run copy-client` | Copy built client assets to `build/` directory |
| `npm run pack` | Create the `.mcpb` package file |
| `npm run mcpb` | Full build + pack workflow for distribution |
| `npm start` | Run the compiled MCP server from `build/` |
| `npm run typecheck` | Type-check TypeScript without emitting files |
| `npm run install:all` | Install dependencies for both server and client |

---

## 🎯 What You Can Do

### Job Search Workflow Example

1. **Authenticate with LinkedIn:**
   ```
   User: "Authenticate my LinkedIn account"
   AI: Opens a browser for you to log in, saves credentials
   ```

2. **Search for opportunities:**
   ```
   User: "Search LinkedIn for 'Senior TypeScript Developer remote' jobs"
   AI: Searches LinkedIn, extracts post details, saves to database
   ```

3. **Review results:**
   ```
   User: "Show me the last 10 posts I found"
   AI: Displays posts with links, descriptions, and metadata
   ```

4. **Visual exploration:**
   ```
   User: "Open the post viewer"
   AI: Launches React dashboard at http://localhost:5174
   ```

5. **Track applications:**
   ```
   User: "Mark posts 5, 7, and 12 as applied"
   AI: Updates the database and confirms
   ```

6. **Filter and manage:**
   ```
   User: "Show only posts from this month that I haven't applied to yet"
   AI: Filters and displays matching posts
   ```

### Additional Use Cases

- **Bulk operations**: "Delete all posts older than 3 months"
- **Analytics**: "How many posts did I save this week?"
- **Smart filtering**: "Show posts with 'React' or 'Vue' that have over 50 likes"
- **Export ready**: Database is SQLite, easily query with SQL tools

---

## 🗄️ Database Schema

Posts are stored in a SQLite database (`linkedin.db`) with the following schema:

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_keywords TEXT NOT NULL,
  post_link TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  search_date TEXT NOT NULL,
  applied INTEGER DEFAULT 0,
  profile_image TEXT DEFAULT '',
  author_name TEXT DEFAULT '',
  author_occupation TEXT DEFAULT '',
  post_date TEXT DEFAULT '',
  like_count TEXT DEFAULT '',
  comment_count TEXT DEFAULT ''
);
```

Indexes are created on `post_link`, `search_date`, and `applied` for fast queries.

---

## 🎨 React Dashboard Features

The built-in web viewer (`start_vite_viewer`) provides:

- **📊 Table View**: Sortable columns with all post metadata
- **🎴 Card View**: Visual cards with profile images and engagement metrics
- **🔍 Advanced Filtering**: By keyword, date range, applied status, and IDs
- **✅ Quick Actions**: Mark posts as applied directly from the UI
- **🔄 Real-time Updates**: Filter state syncs between UI and MCP commands
- **💅 Modern Design**: Built with React, TypeScript, TailwindCSS, and Vite

---

## 🔒 Security & Privacy

- **Credentials**: LinkedIn cookies are stored locally in your system's user data directory
- **No cloud sync**: All data stays on your machine
- **Playwright**: Uses a real browser for authentication (more secure than API scraping)
- **Read-only by default**: Only writes to the database when you explicitly save posts

---

## 🐛 Troubleshooting

### "Tool not found" error
- Make sure you've restarted Cursor/Claude Desktop after installation
- Verify the MCP server is listed in the available servers

### Authentication fails
- LinkedIn may require 2FA - complete it in the browser window
- Try `force_reauth: true` to start fresh

### Browser doesn't open
- Check that Playwright browsers are installed: `npx playwright install`

### Client won't build
- Ensure client dependencies are installed: `cd src/client-vite && npm install`

### Database errors with .mcpb (Node.js version mismatch)
- **Fixed in v1.0.0+**: Now uses sql.js (pure JavaScript) instead of better-sqlite3
- No native module compilation needed - works across all Node.js versions
- If you installed an older version, reinstall the latest .mcpb package

---

## 📄 License

ISC

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 🙏 Acknowledgments

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [Playwright](https://playwright.dev) for browser automation
- [React](https://react.dev) + [Vite](https://vitejs.dev) for the UI
- [SQLite](https://www.sqlite.org) via sql.js (pure JavaScript, no native dependencies)

---

<div align="center">
  <sub>Job hunting has never been this easy. Let Saitama help you find your next opportunity! 💼🥊</sub>
</div>

