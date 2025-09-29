import { IncomingMessage, ServerResponse } from 'http';

// Type definitions for CSV viewer

export interface CsvViewerResult {
  port: number;
  status: string;
  url: string;
  message: string;
}

export type MiddlewareRequest = IncomingMessage;

export type MiddlewareResponse = ServerResponse;

export type NextFunction = () => void;

export interface CsvFileInfo {
  filename: string;
  displayName: string;
}
