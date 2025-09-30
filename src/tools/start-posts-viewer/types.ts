import { IncomingMessage, ServerResponse } from 'http';

// Type definitions for post viewer

export interface PostViewerResult {
  port: number;
  status: string;
  url: string;
  message: string;
}

export type MiddlewareRequest = IncomingMessage;

export type MiddlewareResponse = ServerResponse;

export type NextFunction = () => void;
