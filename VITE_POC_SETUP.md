# Vite MCP Tool - Proof of Concept

## ✅ Setup Complete!

This document outlines the minimal Vite + React integration that was created as a proof of concept.

## What Was Created

### 1. New Vite React App (`src/client-vite/`)
- **React 18** with TypeScript
- **Vite 6** for fast HMR (Hot Module Replacement)
- Boilerplate UI showing proof of concept
- Independent from existing vanilla JS viewer

### 2. New MCP Tool (`start_vite_viewer`)
- Tool handler: `src/tools/start-vite-viewer.ts`
- Spawns Vite dev server on port 5173
- Automatically opens browser
- Registered in main MCP server

### 3. Dependencies Added
- `open@10.1.0` - Opens browser automatically
- `@types/open` - TypeScript definitions

## File Structure

```
src/
├── client-vite/              # NEW - Vite React app (SOURCE - editable)
│   ├── src/
│   │   ├── App.tsx          # Main React component (edit for HMR)
│   │   ├── main.tsx         # React entry point
│   │   ├── index.css        # Styles
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── node_modules/        # Vite dependencies
│
├── tools/
│   ├── start-vite-viewer.ts  # NEW - Vite tool handler
│   └── start-posts-viewer/   # UNCHANGED - Original live-server tool
│
└── index.ts                  # MODIFIED - Added new tool registration

build/
├── tools/
│   └── start-vite-viewer.js  # Compiled tool (points back to src/)
└── index.js                  # Compiled MCP server
```

## Architecture (HMR-Enabled)

```
MCP Tool Execution:
  build/index.js (MCP server)
    ↓
  build/tools/start-vite-viewer.js (spawns npm run dev)
    ↓
  src/client-vite/ (Vite dev server with HMR)
    ↓
  http://localhost:5173 (Browser with WebSocket)

Edit src/client-vite/src/App.tsx
  → Vite detects change
  → Browser updates via WebSocket
  → NO PAGE REFRESH! ✨
```

**This is the correct approach for local MCP** because:
- ✅ Always runs locally (never deployed)
- ✅ HMR for instant feedback
- ✅ No need to rebuild between edits
- ✅ Tool references source directly

## How to Use

### From Claude (MCP Client):

Ask Claude to run:
```
Use the start_vite_viewer tool
```

### Manually (for testing):

1. **Build the MCP server:**
   ```bash
   npm run build
   ```

2. **Test Vite app directly:**
   ```bash
   cd src/client-vite
   npm run dev
   ```

## What Works Now

✅ **MCP tool launches Vite server**  
✅ **Browser opens automatically**  
✅ **React + TypeScript working**  
✅ **Hot Module Replacement (HMR) enabled**  
✅ **Independent from original viewer**  

## What's NOT Implemented Yet

❌ No API integration (`/api/posts` endpoints)  
❌ No data fetching or state management  
❌ No migration of existing UI components  
❌ No DB watching/reactivity  
❌ Original `start visualization page` tool unchanged  

## Success Criteria Met

- [x] Tool launches Vite server
- [x] Browser opens automatically
- [x] Shows "Hello from Vite + React"
- [x] Hot reload works when editing React files
- [x] Old tool still works unchanged

## Next Steps (Future)

When ready to proceed with full migration:

1. **Phase 1: Basic Integration**
   - Connect React app to existing `/api/posts` endpoints
   - Implement data fetching with polling (every 3-5 seconds)
   - Add state management (Zustand/Jotai)

2. **Phase 2: UI Migration**
   - Port table view from vanilla JS to React components
   - Port screenshot gallery view
   - Add filters and search

3. **Phase 3: Real-time Updates**
   - Implement DB file watcher
   - Add SSE (Server-Sent Events) endpoint
   - Remove/reduce polling
   - Optimistic updates

## Testing

1. **Build and test:**
   ```bash
   npm run build
   npm run dev
   ```

2. **From Claude, use the tool:**
   - Tool name: `start_vite_viewer`
   - Should open browser to http://localhost:5173
   - Should show purple gradient with success message

3. **Test HMR:**
   - Edit `src/client-vite/src/App.tsx`
   - Save the file
   - Browser should update instantly without full refresh

## Troubleshooting

### Port already in use
If port 5173 is busy, either:
- Stop the existing Vite process
- Or modify `src/client-vite/vite.config.ts` to use a different port

### Dependencies not installed
```bash
cd src/client-vite
npm install
```

### Build errors
Make sure all root dependencies are installed:
```bash
npm install
```

---

**Status:** ✅ Proof of Concept Complete  
**Date:** 2025-09-30  
**Ready for:** Full migration when approved

