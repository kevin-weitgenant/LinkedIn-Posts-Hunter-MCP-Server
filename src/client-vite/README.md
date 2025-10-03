# LinkedIn Vite Viewer

Proof of concept React + Vite application launched via MCP tool.

## Setup

1. Install dependencies:
   ```bash
   cd src/client-vite
   npm install
   ```

2. Test locally (optional):
   ```bash
   npm run dev
   ```

3. Build for production (optional):
   ```bash
   npm run build
   ```

## Usage

Launch via MCP tool from Claude:
- Tool name: `start_viewer`
- The tool will automatically start the Vite dev server and open your browser

## Features

- ✅ React 18 with TypeScript
- ✅ Vite for fast HMR (Hot Module Replacement)
- ✅ Automatic browser launch
- ✅ Launched as MCP tool

## Next Steps

- Connect to existing API endpoints (`/api/posts`)
- Implement data fetching and state management
- Migrate post viewer UI from vanilla JS
- Add DB reactivity (polling or SSE)

