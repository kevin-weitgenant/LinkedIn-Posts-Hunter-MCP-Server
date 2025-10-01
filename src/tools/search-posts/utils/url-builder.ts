/**
 * LinkedIn URL building utilities
 */

/**
 * Build LinkedIn content search URL with filters
 * Applies past-month filter and sorts by relevance
 */
export const buildSearchUrl = (keywords: string): string => {
  const encodedKeywords = encodeURIComponent(keywords);
  return `https://www.linkedin.com/search/results/content/?datePosted=%22past-month%22&keywords=${encodedKeywords}&origin=FACETED_SEARCH&sortBy=%22relevance%22`;
};

/**
 * Build LinkedIn post URL from URN
 */
export const buildPostUrl = (urn: string): string => {
  return `https://www.linkedin.com/feed/update/${urn}/`;
};



