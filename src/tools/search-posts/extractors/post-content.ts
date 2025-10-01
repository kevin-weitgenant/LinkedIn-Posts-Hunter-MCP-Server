/**
 * LinkedIn post content extraction
 */

import { Page } from 'playwright';
import path from 'path';
import { getScreenshotsPath } from '../../../utils/paths.js';
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
    console.error('Failed to extract description:', error instanceof Error ? error.message : error);
    return '[Description extraction failed]';
  }
};

/**
 * Capture screenshot of post content
 */
export const captureScreenshot = async (page: Page, urn: string): Promise<string | undefined> => {
  try {
    const screenshotsDir = getScreenshotsPath();
    const timestamp = Date.now();
    const sanitizedUrn = urn.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `post_${sanitizedUrn}_${timestamp}.png`;
    const fullPath = path.join(screenshotsDir, filename);
    
    // Try to screenshot the specific post element
    const postElement = await page.$('div.update-components-text.relative.update-components-update-v2__commentary');
    if (postElement) {
      await postElement.screenshot({ path: fullPath, type: 'png' });
      return `screenshots/${filename}`;
    }
  } catch (error) {
    // Log but don't fail - screenshot is optional
    console.error('Failed to capture screenshot:', error instanceof Error ? error.message : error);
  }
  return undefined;
};

/**
 * Extract all post content from a LinkedIn post page
 */
export const extractPostContent = async (
  page: Page,
  url: string,
  urn: string,
  enableScreenshots: boolean = true
): Promise<PostResult> => {
  // Import metadata extractors dynamically to avoid circular deps
  const { 
    extractProfileImage, 
    extractAuthorName, 
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
    postDate,
    likeCount,
    commentCount,
    screenshotPath
  ] = await Promise.all([
    extractDescription(page),
    extractProfileImage(page),
    extractAuthorName(page),
    extractPostDate(page),
    extractLikeCount(page),
    extractCommentCount(page),
    enableScreenshots ? captureScreenshot(page, urn) : Promise.resolve(undefined)
  ]);
  
  return {
    link: url,
    description,
    screenshotPath,
    profileImage,
    authorName,
    postDate,
    likeCount,
    commentCount
  };
};



