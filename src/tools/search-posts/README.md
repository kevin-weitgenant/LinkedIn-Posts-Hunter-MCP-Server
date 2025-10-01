# LinkedIn Search Posts Module

Clean, modular structure for searching LinkedIn posts with no confusing re-exports.

## 📁 Structure

```
search-posts/
├── mcp-handler.ts           # MCP tool handler (main entry point)
├── core/
│   └── search.ts           # Core search logic (pure, no DB)
├── extractors/
│   ├── post-content.ts     # Post content & screenshot extraction
│   └── metadata.ts         # Author, date, likes, comments
├── utils/
│   ├── types.ts           # Type definitions
│   └── url-builder.ts     # URL construction utilities
└── test-runner.ts         # Test script for manual testing
```

## 🎯 Key Files

### `mcp-handler.ts` - Main MCP Tool
The entry point for the MCP server. Handles:
- Calling the core search function
- Saving results to database
- Formatting MCP responses

**Import:**
```typescript
import { handleLinkedInSearchPosts } from './tools/search-posts/mcp-handler.js';
```

### `core/search.ts` - Pure Search Function
The core search logic without database operations. Perfect for testing!

**Import:**
```typescript
import { searchLinkedInPosts } from './tools/search-posts/core/search.js';

// Use directly for testing (no database writes)
const results = await searchLinkedInPosts(
  '"software engineer" AND "remote"',
  3,  // pagination
  {
    enableScreenshots: false,
    concurrency: 8
  }
);
```

### `test-runner.ts` - Test Script
Run the search function directly without database operations.

**Usage:**
```bash
npx tsx src/tools/search-posts/test-runner.ts
```

## 📦 Module Organization

### `core/` - Search Logic
- `search.ts` - Main search function, browser automation, concurrent processing

### `extractors/` - Content Extraction
- `post-content.ts` - Extracts description, captures screenshots
- `metadata.ts` - Extracts author, date, likes, comments

### `utils/` - Shared Utilities
- `types.ts` - TypeScript interfaces and types
- `url-builder.ts` - LinkedIn URL construction

## 🔧 Direct Imports (No Re-exports)

Every import is explicit and direct:

```typescript
// Main MCP handler
import { handleLinkedInSearchPosts } from './tools/search-posts/mcp-handler.js';

// Core search function
import { searchLinkedInPosts } from './tools/search-posts/core/search.js';

// Types
import type { PostResult, SearchOptions } from './tools/search-posts/utils/types.js';

// Utilities
import { buildSearchUrl } from './tools/search-posts/utils/url-builder.js';

// Extractors
import { extractPostContent } from './tools/search-posts/extractors/post-content.js';
import { extractAuthorName } from './tools/search-posts/extractors/metadata.js';
```

## 🧪 Testing

The core function is designed for easy testing without side effects:

```typescript
import { searchLinkedInPosts } from './tools/search-posts/core/search.js';

// Test without database operations
const results = await searchLinkedInPosts('test query', 2);
// Assert on results...
```

Or use the test runner:
```bash
npx tsx src/tools/search-posts/test-runner.ts
```

## ✨ Benefits

1. ✅ **No Re-exports** - Direct imports only, clear dependencies
2. ✅ **Organized** - Related code grouped in logical folders
3. ✅ **Testable** - Core function runs without database operations
4. ✅ **Maintainable** - Small, focused files with single responsibilities
5. ✅ **Scalable** - Easy to add new extractors or utilities

## 🔄 Migration Notes

**Old (confusing):**
```typescript
import { handleLinkedInSearchPosts } from './tools/search-posts.js';  // Re-export
```

**New (clear):**
```typescript
import { handleLinkedInSearchPosts } from './tools/search-posts/mcp-handler.js';  // Direct
```

All imports are now explicit - you know exactly where each function comes from.
