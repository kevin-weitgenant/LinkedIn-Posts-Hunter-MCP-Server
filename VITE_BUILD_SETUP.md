# ✅ Vite Build Setup Complete!

## Problem Solved

Previously:
```
build/tools/start-vite-viewer.js
  ↓ (tried to spawn npm run dev)
src/client-vite/  ← NOT in .mcpb package! ❌
```

Now:
```
build/tools/start-vite-viewer.js
  ↓ (spawns npm run dev)
build/client-vite/  ← Copied during build! ✅
  ├── src/App.tsx (editable with HMR!)
  ├── package.json
  ├── vite.config.ts
  └── (no node_modules yet)
```

---

## What Was Changed

### 1. **Created Copy Script** (`scripts/copy-client.js`)
- Copies `src/client-vite/` → `build/client-vite/`
- Excludes: `node_modules`, `dist`, `.DS_Store`
- Runs automatically during build

### 2. **Updated Build Process** (`package.json`)
```json
"build": "tsc && npm run copy-client"
```
Now builds in 2 steps:
1. Compile TypeScript → `build/`
2. Copy Vite app → `build/client-vite/`

### 3. **Updated Tool** (`src/tools/start-vite-viewer.ts`)
Changed paths:
```typescript
// OLD:
const clientDir = path.join(projectRoot, 'src', 'client-vite');

// NEW:
const buildRoot = path.resolve(__dirname, '..');
const clientDir = path.join(buildRoot, 'client-vite');
```

### 4. **Auto-Install Dependencies**
First run checks for `node_modules`:
```typescript
if (!fs.existsSync(nodeModulesPath)) {
  // Automatically runs: npm install
  // Then starts: npm run dev
}
```

---

## Build Process Flow

```
npm run build
  ↓
1. npm run clean
   └─> rimraf build/
  ↓
2. tsc
   └─> Compile TypeScript
       └─> build/index.js
       └─> build/tools/start-vite-viewer.js
  ↓
3. npm run copy-client
   └─> node scripts/copy-client.js
       └─> Copy src/client-vite/ → build/client-vite/
           └─> Excludes: node_modules, dist
```

---

## First Run Behavior

When you use the tool **first time after build**:

```
1. Tool starts: build/tools/start-vite-viewer.js
2. Checks: build/client-vite/node_modules
3. Not found? Auto-installs:
   📦 Installing Vite client dependencies (first run)...
   [npm install runs in build/client-vite/]
   ✅ Dependencies installed successfully!
4. Starts Vite dev server: npm run dev
5. Browser opens → http://localhost:5173
6. HMR is active! ✨
```

**Subsequent runs**: Skip step 3 (dependencies already installed)

---

## File Structure After Build

```
build/
├── client-vite/              # Copied from src/
│   ├── src/
│   │   ├── App.tsx          # Editable! HMR works!
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── node_modules/        # Auto-installed on first run
│
├── tools/
│   └── start-vite-viewer.js # Points to ../client-vite
│
└── index.js                 # MCP server
```

---

## HMR Still Works!

**YES!** You can still edit files with instant updates:

1. Run tool from Claude
2. Browser opens with Vite app
3. Edit: `build/client-vite/src/App.tsx`
4. Save → Browser updates instantly! 🔥

**Why?** Because:
- Vite dev server watches `build/client-vite/src/`
- HMR via WebSocket detects changes
- Browser hot-reloads the component

---

## .mcpb Packaging

When you run `npm run mcpb`:

```
1. npm run clean  → Remove build/
2. npm run build  → Build + Copy client
3. npm run pack   → Create .mcpb package
   └─> Includes: build/ (everything!)
       └─> build/client-vite/ ✅
```

The package now contains:
- ✅ MCP server code
- ✅ All tools
- ✅ Complete Vite React app
- ✅ Auto-installs dependencies on first run

---

## Testing

### Build and Verify
```bash
npm run clean
npm run build
```

### Check Files Copied
```bash
ls build/client-vite/
# Should show: src/, index.html, package.json, vite.config.ts, etc.
```

### Test the Tool
From Claude:
```
Use the start_vite_viewer tool
```

Expected:
1. First run: See "Installing dependencies..." message
2. Browser opens to localhost:5173
3. See purple gradient page
4. Edit `build/client-vite/src/App.tsx`
5. Save → Browser updates instantly!

---

## Benefits

✅ **HMR preserved** - Edit files, see instant updates  
✅ **Packaging works** - `.mcpb` includes everything  
✅ **Auto-install** - No manual setup needed  
✅ **Clean builds** - Everything in `build/`  
✅ **Local-first** - Perfect for MCP dev workflow  

---

## Commands Reference

```bash
# Clean build directory
npm run clean

# Build everything (TypeScript + copy client)
npm run build

# Copy client only (after tsc)
npm run copy-client

# Build and package
npm run mcpb

# Dev mode (run without building)
npm run dev
```

---

**Status:** ✅ Complete and Tested  
**Date:** 2025-09-30  
**HMR:** ✅ Still works!  
**Packaging:** ✅ Now includes Vite app!

