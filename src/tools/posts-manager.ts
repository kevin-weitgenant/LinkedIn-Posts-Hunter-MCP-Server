import { 
  queryPosts, 
  updatePostsBulk, 
  deletePostsBulk, 
  countPosts 
} from '../db/operations.js';
import type { DbPost } from '../db/operations.js';

export interface PostManagerParams {
  action: 'read' | 'update' | 'delete';
  ids?: number[];
  search_text?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  applied?: boolean;
  saved?: boolean;
  
  // For updates only
  new_description?: string;
  new_keywords?: string;
  new_applied?: boolean;
  new_saved?: boolean;
}

/**
 * Format post for display
 */
const formatPost = (post: DbPost): string => {
  const maxDescLength = 300;
  let desc = post.description;
  
  if (desc.length > maxDescLength) {
    desc = desc.substring(0, maxDescLength) + '...';
  }
  
  const date = new Date(post.search_date).toISOString().split('T')[0];
  const appliedStatus = post.applied === 1 ? '✓ Applied' : '○ Not Applied';
  const savedStatus = post.saved === 1 ? '🔖 Saved' : '○ Not Saved';
  
  // Build author info line if available
  let authorInfo = '';
  if (post.author_name) {
    authorInfo = `     Author: ${post.author_name}`;
    if (post.post_date) {
      authorInfo += ` • ${post.post_date}`;
    }
    authorInfo += '\n';
  }
  
  // Build engagement info line if available
  let engagementInfo = '';
  if (post.like_count || post.comment_count) {
    engagementInfo = '     Engagement: ';
    const parts = [];
    if (post.like_count) parts.push(`${post.like_count} likes`);
    if (post.comment_count) parts.push(post.comment_count);
    engagementInfo += parts.join(' • ') + '\n';
  }
  
  return `#${post.id} | Keywords: ${post.search_keywords}
     Link: ${post.post_link}
${authorInfo}${engagementInfo}     Desc: ${desc}
     Date: ${date}
     Status: ${appliedStatus} | ${savedStatus}`;
};

/**
 * Handle read action
 */
const handleRead = async (params: PostManagerParams): Promise<string> => {
  const limit = params.limit ?? 10;
  
  const posts = await queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
    applied: params.applied,
    saved: params.saved,
    limit: limit
  });
  
  const totalPosts = await countPosts();
  
  if (posts.length === 0) {
    return `No posts found matching your criteria.\n\nTotal posts in database: ${totalPosts}`;
  }
  
  let result = `Found ${posts.length} of ${totalPosts} total posts`;
  
  if (posts.length >= limit) {
    result += ` (showing up to ${limit})`;
  }
  
  const filters = [];
  if (params.applied !== undefined) {
    filters.push(`applied: ${params.applied ? 'yes' : 'no'}`);
  }
  if (params.saved !== undefined) {
    filters.push(`saved: ${params.saved ? 'yes' : 'no'}`);
  }
  if (filters.length > 0) {
    result += ` (filtered by: ${filters.join(', ')})`;
  }
  
  result += ':\n\n';
  
  posts.forEach(post => {
    result += formatPost(post) + '\n\n';
  });
  
  result += `💡 Use IDs to update/delete specific posts.`;
  
  return result;
};

/**
 * Handle update action
 */
const handleUpdate = async (params: PostManagerParams): Promise<string> => {
  if (!params.new_description && !params.new_keywords && params.new_applied === undefined && params.new_saved === undefined) {
    return 'Error: Must provide new_description, new_keywords, new_applied, or new_saved for update action.';
  }
  
  // First, get the posts to update based on filters
  const postsToUpdate = await queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
    applied: params.applied,
    saved: params.saved
  });
  
  if (postsToUpdate.length === 0) {
    return 'No posts found matching your criteria. No updates made.';
  }
  
  const postIds = postsToUpdate.map(p => p.id);
  
  const updateCount = await updatePostsBulk(postIds, {
    new_description: params.new_description,
    new_keywords: params.new_keywords,
    new_applied: params.new_applied,
    new_saved: params.new_saved
  });
  
  return `✓ Updated ${updateCount} ${updateCount === 1 ? 'post' : 'posts'} (IDs: ${postIds.join(', ')})`;
};

/**
 * Handle delete action
 */
const handleDelete = async (params: PostManagerParams): Promise<string> => {
  // First, get the posts to delete based on filters
  const postsToDelete = await queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
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
 * Main handler for post manager tool
 */
export const handleLinkedInManagePosts = async (params: PostManagerParams) => {
  try {
    let result: string;
    
    switch (params.action) {
      case 'read':
        result = await handleRead(params);
        break;
        
      case 'update':
        result = await handleUpdate(params);
        break;
        
      case 'delete':
        result = await handleDelete(params);
        break;
        
      default:
        result = `Error: Unknown action "${params.action}". Use: read, update, or delete.`;
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
