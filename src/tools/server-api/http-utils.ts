import { IncomingMessage, ServerResponse } from 'http';

export type HttpRequest = IncomingMessage;
export type HttpResponse = ServerResponse;

/**
 * Send a JSON response with proper headers
 */
export function sendJson(res: HttpResponse, statusCode: number, data: any): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

/**
 * Send an error response
 */
export function sendError(res: HttpResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

/**
 * Send an image response
 */
export function sendImage(res: HttpResponse, imageBuffer: Buffer, contentType = 'image/png'): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200);
  res.end(imageBuffer);
}

/**
 * Send a plain text response
 */
export function sendText(res: HttpResponse, statusCode: number, text: string): void {
  res.writeHead(statusCode);
  res.end(text);
}

/**
 * Parse JSON body from request stream
 */
export function parseJsonBody<T = any>(req: HttpRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Extract ID from URL path like /api/posts/:id
 */
export function extractIdFromUrl(url: string, basePattern: string): number | null {
  const cleanUrl = url.replace(basePattern, '');
  const id = parseInt(decodeURIComponent(cleanUrl));
  return isNaN(id) ? null : id;
}

/**
 * Extract path segments from URL
 */
export function getUrlSegments(url: string): string[] {
  return url.split('/').filter(segment => segment.length > 0);
}

