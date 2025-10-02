import { 
  queryPosts, 
  deletePostsBulk, 
  countPosts 
} from '../db/operations.js';
import type { DbPost } from '../db/operations.js';

export interface PostManagerParams {
  action: 'read' | 'delete' | 'count';
  ids?: number[];
  keyword?: string;
  contains?: string;
  limit?: number;
  offset?: number;
  applied?: boolean;
  saved?: boolean;
}

/**
 * Format post for display (minimal: ID, keyword, description)
 */
const formatPost = (post: DbPost): string => {
  return `--- Post #${post.id} ---
Keyword: ${post.search_keywords}
Description: ${post.description}

`;
};

/**
 * Handle read action
 */
const handleRead = async (params: PostManagerParams): Promise<string> => {
  const limit = params.limit ?? 5;
  const offset = params.offset ?? 0;
  
  const posts = await queryPosts({
    ids: params.ids,
    keyword: params.keyword,
    contains: params.contains,
    applied: params.applied,
    saved: params.saved,
    limit: limit,
    offset: offset
  });
  
  const totalPosts = await countPosts({
    keyword: params.keyword,
    contains: params.contains,
    applied: params.applied,
    saved: params.saved
  });
  
  if (posts.length === 0) {
    return `No posts found matching your criteria.\n\nTotal posts in database: ${await countPosts()}`;
  }
  
  // Build context description
  const contextParts: string[] = [];
  if (params.keyword) contextParts.push(`keyword: "${params.keyword}"`);
  if (params.contains) contextParts.push(`containing: "${params.contains}"`);
  if (params.applied !== undefined) contextParts.push(`applied: ${params.applied ? 'yes' : 'no'}`);
  if (params.saved !== undefined) contextParts.push(`saved: ${params.saved ? 'yes' : 'no'}`);
  
  let result = '';
  
  if (contextParts.length > 0) {
    result += `Found ${totalPosts} posts (${contextParts.join(', ')})\n`;
  } else {
    result += `Found ${totalPosts} posts\n`;
  }
  
  result += `Showing ${posts.length} posts (offset: ${offset}):\n\n`;
  
  posts.forEach(post => {
    result += formatPost(post);
  });
  
  // Pagination hint
  const nextOffset = offset + posts.length;
  if (nextOffset < totalPosts) {
    result += `\n💡 Next batch: use offset=${nextOffset}`;
  } else {
    result += `\n✓ All posts shown`;
  }
  
  return result;
};

/**
 * Handle delete action
 */
const handleDelete = async (params: PostManagerParams): Promise<string> => {
  // First, get the posts to delete based on filters
  const postsToDelete = await queryPosts({
    ids: params.ids,
    keyword: params.keyword,
    contains: params.contains,
    applied: params.applied,
    saved: params.saved
  });
  
  if (postsToDelete.length === 0) {
    return 'No posts found matching your criteria. No deletions made.';
  }
  
  const postIds = postsToDelete.map(p => p.id);
  const deleteCount = await deletePostsBulk(postIds);
  
  return `✓ Deleted ${deleteCount} ${deleteCount === 1 ? 'post' : 'posts'} (IDs: ${postIds.join(', ')})`;
};

/**
 * Handle count action
 */
const handleCount = async (params: PostManagerParams): Promise<string> => {
  const total = await countPosts({
    keyword: params.keyword,
    contains: params.contains,
    applied: params.applied,
    saved: params.saved
  });
  
  // Build context description
  const contextParts: string[] = [];
  if (params.keyword) contextParts.push(`keyword: "${params.keyword}"`);
  if (params.contains) contextParts.push(`containing: "${params.contains}"`);
  if (params.applied !== undefined) contextParts.push(`applied: ${params.applied ? 'yes' : 'no'}`);
  if (params.saved !== undefined) contextParts.push(`saved: ${params.saved ? 'yes' : 'no'}`);
  
  if (contextParts.length > 0) {
    return `Found ${total} posts (${contextParts.join(', ')})`;
  } else {
    return `Total posts in database: ${total}`;
  }
};

/**
 * Main handler for post manager tool
 */
export const handleLinkedInManagePosts = async (params: PostManagerParams) => {
  try {
    let result: string;
    
    switch (params.action) {
      case 'read':
        result = await handleRead(params);
        break;
        
      case 'delete':
        result = await handleDelete(params);
        break;
        
      case 'count':
        result = await handleCount(params);
        break;
        
      default:
        result = `Error: Unknown action "${params.action}". Use: read, delete, or count.`;
    }
    
    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
};
