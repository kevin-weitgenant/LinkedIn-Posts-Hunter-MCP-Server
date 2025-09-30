# Quick Test Guide

## Test the Fixed Build

### 1. Build Everything
```bash
npm run build
```

You should see:
```
> tsc
> npm run copy-client

📦 Copying client-vite to build folder...
   ✅ Client copied successfully!
```

### 2. Verify Files Were Copied
```bash
ls build/client-vite/
```

Should show:
- ✅ `src/` directory
- ✅ `index.html`
- ✅ `package.json`
- ✅ `vite.config.ts`

### 3. Use the Tool from Claude

Ask Claude:
```
Use the start_vite_viewer tool
```

**First time:** You'll see:
```
📦 Installing Vite client dependencies (first run)...
[npm install runs...]
✅ Dependencies installed successfully!
```

Then browser opens!

### 4. Test HMR

While Vite is running:
1. Open: `build/client-vite/src/App.tsx`
2. Change line 10:
   ```tsx
   <p className="subtitle">HMR WORKS FROM BUILD FOLDER! 🔥</p>
   ```
3. Save
4. **Browser updates instantly!** ✨

---

## What's Different Now?

**Before:**
- Tool tried to use `src/client-vite/`
- Wouldn't work when packaged as `.mcpb`

**After:**
- Tool uses `build/client-vite/`
- Everything needed is in `build/`
- `.mcpb` packaging will include it
- Still has HMR! 🎉

---

## Next: Package as .mcpb

When ready to package:
```bash
npm run mcpb
```

This will:
1. Clean build
2. Build TypeScript + copy client
3. Create `.mcpb` file with everything included

