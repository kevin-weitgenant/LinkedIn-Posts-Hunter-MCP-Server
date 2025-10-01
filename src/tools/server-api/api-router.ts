import { HttpRequest, HttpResponse } from './http-utils.js';
import {
  handleGetAllPosts,
  handleGetSinglePost,
  handleBulkUpdatePosts,
  handleDeletePost,
  handleUpdateAppliedStatus,
  handleGetScreenshot
} from './api-handlers.js';

type NextFunction = () => void;

/**
 * Route definition for cleaner routing logic
 */
interface Route {
  method: string;
  pattern: RegExp;
  handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>;
}

/**
 * All API routes
 */
const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/posts$/,
    handler: handleGetAllPosts
  },
  {
    method: 'POST',
    pattern: /^\/api\/posts\/bulk-update$/,
    handler: handleBulkUpdatePosts
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/posts\/\d+\/applied$/,
    handler: handleUpdateAppliedStatus
  },
  {
    method: 'GET',
    pattern: /^\/api\/posts\/\d+$/,
    handler: handleGetSinglePost
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/posts\/\d+$/,
    handler: handleDeletePost
  },
  {
    method: 'GET',
    pattern: /^\/api\/screenshots\/.+$/,
    handler: handleGetScreenshot
  }
];

/**
 * Create middleware function to handle API requests
 * Routes requests to appropriate handlers based on URL pattern and method
 */
export function createApiMiddleware() {
  return function(req: HttpRequest, res: HttpResponse, next: NextFunction): void {
    const url = req.url || '';
    const method = req.method || 'GET';
    
    // Find matching route
    for (const route of routes) {
      if (route.method === method && route.pattern.test(url)) {
        const result = route.handler(req, res);
        
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            console.error('Error in async handler:', error);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });
        }
        
        return;
      }
    }
    
    // No route matched, continue to next middleware
    next();
  };
}

