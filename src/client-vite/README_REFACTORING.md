# LinkedIn Viewer Refactoring

## Overview
The React app has been refactored into a modular component structure with two main views accessible via tabs.

## Architecture

### Component Structure
```
src/
├── App.tsx              # Main app with tab navigation
├── types.ts             # Shared TypeScript interfaces
├── components/
│   ├── ScreenshotView.tsx  # Screenshot gallery view
│   └── TableView.tsx       # Data table view
└── index.css            # Global styles
```

### Features

#### Screenshot View (Default Tab)
- **One-column vertical grid layout** for screenshot display
- **Three action buttons per screenshot:**
  - 🔗 **Go to Post**: Opens LinkedIn post in new tab
  - ✅/⭕ **Toggle Applied**: Marks/unmarks post as applied
  - 🗑️ **Delete**: Removes post from database
- **Visual indicators:**
  - Applied badge for applied posts
  - Post date and keywords
  - Description preview (3 lines max)
- **Hover effects** for better UX

#### Table View
- **Comprehensive data table** showing all post fields
- **Inline editing:**
  - Click ✏️ to edit keywords, description, and applied status
  - Save or cancel changes
- **Quick actions:**
  - 🔗 Link to post
  - ✏️ Edit entry
  - 🗑️ Delete entry
- **Toggle applied status** with single click
- **Responsive design** with horizontal scroll on small screens

### Backend Integration
The app uses the REST API from `server-api/`:

- `GET /api/posts` - Fetch all posts (auto-polling every 3s)
- `GET /api/posts/:id` - Get single post
- `PATCH /api/posts/:id/applied` - Update applied status
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/bulk-update` - Update multiple posts
- `GET /api/screenshots/:filename` - Serve screenshot images

### Styling
- **Modern gradient theme** (purple to blue)
- **Card-based layout** with shadow effects
- **Responsive design** for mobile and desktop
- **Smooth transitions** and hover effects
- **Color-coded buttons** for different actions
- **Consistent spacing** and typography

## Usage

### Development
```bash
cd src/client-vite
npm run dev
```

### Production Build
```bash
cd src/client-vite
npm run build
```

Or from project root:
```bash
npm run build
```

### Starting the Viewer
Use the MCP tool from Claude:
- `start_vite_viewer` - Starts the server and opens browser
- `stop_vite_viewer` - Stops the running server

## Key Improvements
1. **Modular code** - Separated concerns into focused components
2. **Better UX** - Visual screenshot gallery as default view
3. **Full CRUD** - Edit and delete capabilities in both views
4. **Type safety** - Shared TypeScript interfaces
5. **Maintainability** - Easy to extend with new features
6. **Responsive** - Works on all screen sizes
7. **Real-time updates** - Auto-polling keeps data fresh


