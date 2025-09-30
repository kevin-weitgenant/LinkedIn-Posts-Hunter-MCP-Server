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
  
  // For updates only
  new_description?: string;
  new_keywords?: string;
  new_applied?: boolean;
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
  
  return `#${post.id} | Keywords: ${post.search_keywords}
     Link: ${post.post_link}
     Desc: ${desc}
     Date: ${date}
     Status: ${appliedStatus}`;
};

/**
 * Handle read action
 */
const handleRead = (params: PostManagerParams): string => {
  const limit = params.limit ?? 10;
  
  const posts = queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
    applied: params.applied,
    limit: limit
  });
  
  const totalPosts = countPosts();
  
  if (posts.length === 0) {
    return `No posts found matching your criteria.\n\nTotal posts in database: ${totalPosts}`;
  }
  
  let result = `Found ${posts.length} of ${totalPosts} total posts`;
  
  if (posts.length >= limit) {
    result += ` (showing up to ${limit})`;
  }
  
  if (params.applied !== undefined) {
    result += ` (filtered by: ${params.applied ? 'applied' : 'not applied'})`;
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
const handleUpdate = (params: PostManagerParams): string => {
  if (!params.new_description && !params.new_keywords && params.new_applied === undefined) {
    return 'Error: Must provide new_description, new_keywords, or new_applied for update action.';
  }
  
  // First, get the posts to update based on filters
  const postsToUpdate = queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
    applied: params.applied
  });
  
  if (postsToUpdate.length === 0) {
    return 'No posts found matching your criteria. No updates made.';
  }
  
  const postIds = postsToUpdate.map(p => p.id);
  
  const updateCount = updatePostsBulk(postIds, {
    new_description: params.new_description,
    new_keywords: params.new_keywords,
    new_applied: params.new_applied
  });
  
  return `✓ Updated ${updateCount} ${updateCount === 1 ? 'post' : 'posts'} (IDs: ${postIds.join(', ')})`;
};

/**
 * Handle delete action
 */
const handleDelete = (params: PostManagerParams): string => {
  // First, get the posts to delete based on filters
  const postsToDelete = queryPosts({
    ids: params.ids,
    search_text: params.search_text,
    date_from: params.date_from,
    date_to: params.date_to,
    applied: params.applied
  });
  
  if (postsToDelete.length === 0) {
    return 'No posts found matching your criteria. No deletions made.';
  }
  
  const postIds = postsToDelete.map(p => p.id);
  const deleteCount = deletePostsBulk(postIds);
  
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
        result = handleRead(params);
        break;
        
      case 'update':
        result = handleUpdate(params);
        break;
        
      case 'delete':
        result = handleDelete(params);
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
