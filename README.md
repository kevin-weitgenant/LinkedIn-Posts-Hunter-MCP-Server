<div align="center">
  <img src="saitama-job-hunting.png" alt="Saitama Job Hunting" width="300"/>
  
  # LinkedIn Posts Hunter MCP Server
  
  **Automate LinkedIn job post searching and tracking with AI-powered assistance**
  
  [![MCP](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![Playwright](https://img.shields.io/badge/Playwright-1.55-green)](https://playwright.dev/)
  [![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
  [![Express](https://img.shields.io/badge/Express-5.1-green)](https://expressjs.com/)
  [![Vite](https://img.shields.io/badge/Vite-7.1-purple)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)](https://tailwindcss.com/)
  
</div>

---

## 📖 Overview

**LinkedIn Posts Hunter MCP** is a Model Context Protocol (MCP) server that provides tools for automating LinkedIn job post search and management through your AI assistant (Claude Desktop, Cursor, or other MCP-compatible clients).

### How it works:

**1. Authentication & Scraping**
- The MCP server exposes a Playwright-based tool that your AI assistant can invoke to automate browser interactions with LinkedIn
- First-time use requires logging into LinkedIn through a browser window to capture session cookies
- These cookies are **stored locally on your computer** for persistent authentication
- Once authenticated, your AI assistant can call the search tool with keywords (either from your conversation or suggested by the AI) to scrape job posts

**2. Local Data Storage**
- All scraped posts are saved to a **local SQLite database** on your machine
- The database stores post content, metadata (author, dates, engagement metrics), and tracking info (whether you've applied)
- Your data never leaves your computer

**3. Visual Interface**
- A separate tool launches a **React dashboard** that renders the scraped posts from your local database
- The UI provides table/card views, advanced filtering, and quick actions (mark as applied,save, edit, delete, etc.)
- Changes made in the React app are written to the local database

**4. Dual Control**
- You can manage posts through **either** the React UI **or** through MCP tools like `linkedin_manage_posts` and `linkedin_set_filters`
- The React app updates via **polling**, so changes made through MCP commands are reflected in the UI
- This gives you flexibility: use natural language commands with your AI assistant, or point-and-click in the dashboard



### 🎨 Diagram

<div align="center">
  <img src="diagram.png" alt="LinkedIn MCP Architecture Diagram" width="800"/>
  <p><em>Complete system architecture showing all components and their interactions</em></p>
</div>

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
   git clone https://github.com/yourusername/linkedin-posts-hunter-mcp.git
   cd linkedin-posts-hunter-mcp
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
   git clone https://github.com/yourusername/linkedin-posts-hunter-mcp.git
   cd linkedin-posts-hunter-mcp
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
       "linkedin-posts-hunter-mcp": {
         "command": "node",
         "args": [
           "F:/projects/linkedin/linkedin-posts-hunter-mcp/build/index.js"
         ],
         "cwd": "F:/projects/linkedin/linkedin-posts-hunter-mcp"
       }
     }
   }
   ```
   
   **⚠️ Important:** Replace `F:/projects/linkedin/linkedin-posts-hunter-mcp` with your actual project path.

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

