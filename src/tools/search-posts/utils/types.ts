/**
 * Search posts types and interfaces
 */

export interface SearchPostsParams {
  keywords: string;
  pagination?: number;
}

export interface PostResult {
  link: string;
  description: string;
  screenshotPath?: string;
  profileImage?: string;
  authorName?: string;
  postDate?: string;
  likeCount?: string;
  commentCount?: string;
}

export interface SearchOptions {
  enableScreenshots?: boolean;
  concurrency?: number;
}



