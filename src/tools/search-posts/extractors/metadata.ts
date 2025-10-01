/**
 * LinkedIn post metadata extraction
 * Extracts author info, dates, likes, comments, etc.
 */

import { Page } from 'playwright';

/**
 * Extract profile image URL
 */
export const extractProfileImage = async (page: Page): Promise<string | undefined> => {
  try {
    const profileImageLocator = page.locator(
      'xpath=//div[contains(@class, "ivm-view-attr__img-wrapper")]//img[contains(@class, "EntityPhoto-circle")]'
    );
    if (await profileImageLocator.count() > 0) {
      return await profileImageLocator.first().getAttribute('src') || undefined;
    }
  } catch (error) {
    // Silently fail for optional metadata
  }
  return undefined;
};

/**
 * Extract author name (with duplicate text handling)
 */
export const extractAuthorName = async (page: Page): Promise<string | undefined> => {
  try {
    const nameLocator = page.locator(
      'xpath=//span[contains(@class, "update-components-actor__title")]//span[contains(@class, "hoverable-link-text")]'
    );
    if (await nameLocator.count() > 0) {
      const rawName = await nameLocator.first().textContent() || '';
      const trimmed = rawName.trim();
      
      // Handle LinkedIn's duplicate text bug
      const halfLength = trimmed.length / 2;
      const isDuplicate = 
        trimmed.length % 2 === 0 && 
        trimmed.substring(0, halfLength) === trimmed.substring(halfLength);
      
      return isDuplicate ? trimmed.substring(0, halfLength).trim() : trimmed;
    }
  } catch (error) {
    // Silently fail for optional metadata
  }
  return undefined;
};

/**
 * Extract post date
 */
export const extractPostDate = async (page: Page): Promise<string | undefined> => {
  try {
    const dateLocator = page.locator(
      'xpath=//span[contains(@class, "update-components-actor__sub-description")]//span[@aria-hidden="true"]'
    );
    if (await dateLocator.count() > 0) {
      const rawDate = await dateLocator.first().textContent() || '';
      return rawDate
        .replace(/•/g, '')
        .replace(/\bEdited\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  } catch (error) {
    // Silently fail for optional metadata
  }
  return undefined;
};

/**
 * Extract like count
 */
export const extractLikeCount = async (page: Page): Promise<string | undefined> => {
  try {
    const likeLocator = page.locator(
      'xpath=//span[contains(@class, "social-details-social-counts__reactions-count") and @aria-hidden="true"]'
    );
    if (await likeLocator.count() > 0) {
      const rawLikes = await likeLocator.first().textContent() || '';
      return rawLikes.replace(/\s+/g, ' ').trim();
    }
  } catch (error) {
    // Silently fail for optional metadata
  }
  return undefined;
};

/**
 * Extract comment count
 */
export const extractCommentCount = async (page: Page): Promise<string | undefined> => {
  try {
    const commentLocator = page.locator(
      'xpath=//span[@aria-hidden="true" and contains(normalize-space(.), "comments")]'
    );
    if (await commentLocator.count() > 0) {
      const rawComments = await commentLocator.first().textContent() || '';
      return rawComments.replace(/\s+/g, ' ').trim();
    }
  } catch (error) {
    // Silently fail for optional metadata
  }
  return undefined;
};



