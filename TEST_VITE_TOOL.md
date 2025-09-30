# Test the Vite MCP Tool

## Quick Test

From Claude, say:
```
Use the start_vite_viewer tool
```

Expected:
1. Browser opens to http://localhost:5173
2. See purple gradient page
3. Click counter button (should increment)

## Test HMR (Hot Module Replacement)

While the server is running:

1. Open: `src/client-vite/src/App.tsx`
2. Change line 10 to:
   ```tsx
   <p className="subtitle">HMR IS WORKING! 🔥</p>
   ```
3. Save the file
4. **Watch browser update instantly** (no refresh!)

## What You Should See

✅ Browser opens automatically  
✅ Purple gradient page loads  
✅ Counter button works  
✅ Edits to App.tsx update instantly  

## Architecture Summary

```
MCP Tool (always local)
  ↓
Spawns: npm run dev in src/client-vite/
  ↓
Vite Dev Server on :5173
  ↓
HMR via WebSocket
```

**This is the CORRECT approach for local MCP with HMR!**

No need for:
- ❌ Copying dist files
- ❌ Building Vite app every time
- ❌ Serving static files

Because you want:
- ✅ Instant HMR updates
- ✅ Development mode always
- ✅ Local-only tool

