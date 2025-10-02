/**
 * Search posts types and interfaces
 */

export interface SearchPostsParams {
  keywords: string;
  pagination?: number;
  headless?: boolean;
}

export interface PostResult {
  link: string;
  description: string;
  profileImage?: string;
  authorName?: string;
  authorOccupation?: string;
  postDate?: string;
  likeCount?: string;
  commentCount?: string;
}

export interface SearchOptions {
  concurrency?: number;
  headless?: boolean;
}



