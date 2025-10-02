/**
 * LinkedIn post content extraction
 */

import { Page } from 'playwright';
import type { PostResult } from '../utils/types.js';

/**
 * Extract post description from page
 */
export const extractDescription = async (page: Page): Promise<string> => {
  try {
    const description = await page.$$eval(
      'div.update-components-text.relative.update-components-update-v2__commentary',
      (divs) =>
        divs
          .map((d) => {
            const text = (d as HTMLElement).innerText || '';
            // Collapse consecutive spaces/tabs on same line, but preserve line breaks
            return text.replace(/[ \t]+/g, ' ').trim();
          })
          .filter((t) => t.length > 0)
          .join('\n\n')
    );
    
    if (!description || description.trim().length === 0) {
      return '[No description content found]';
    }
    
    return description;
  } catch (error) {
    return '[Description extraction failed]';
  }
};

/**
 * Extract all post content from a LinkedIn post page
 */
export const extractPostContent = async (
  page: Page,
  url: string,
  urn: string
): Promise<PostResult> => {
  // Import metadata extractors dynamically to avoid circular deps
  const { 
    extractProfileImage, 
    extractAuthorName, 
    extractAuthorOccupation,
    extractPostDate, 
    extractLikeCount, 
    extractCommentCount 
  } = await import('./metadata.js');
  
  // Wait for actual post description content to appear (not just the DOM element)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('div.update-components-text.relative.update-components-update-v2__commentary');
      return el && el.textContent && el.textContent.trim().length > 10;
    },
    { timeout: 0 }
  );
  
  // Extract all content in parallel
  const [
    description,
    profileImage,
    authorName,
    authorOccupation,
    postDate,
    likeCount,
    commentCount
  ] = await Promise.all([
    extractDescription(page),
    extractProfileImage(page),
    extractAuthorName(page),
    extractAuthorOccupation(page),
    extractPostDate(page),
    extractLikeCount(page),
    extractCommentCount(page)
  ]);
  
  return {
    link: url,
    description,
    profileImage,
    authorName,
    authorOccupation,
    postDate,
    likeCount,
    commentCount
  };
};



