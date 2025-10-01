// Type definitions matching database schema
export interface Post {
  id: number
  search_keywords: string
  post_link: string
  description: string
  search_date: string
  screenshot_path: string
  applied: number // 0 or 1 (SQLite boolean)
  profile_image: string
  author_name: string
  post_date: string
  like_count: string
  comment_count: string
}


