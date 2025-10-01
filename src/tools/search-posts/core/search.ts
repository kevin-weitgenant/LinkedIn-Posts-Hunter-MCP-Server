/**
 * Core LinkedIn search functionality (pure, no database operations)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { loadAuthData, isAuthDataValid } from '../../../auth/storage.js';
import { buildSearchUrl, buildPostUrl } from '../utils/url-builder.js';
import { extractPostContent } from '../extractors/post-content.js';
import type { PostResult, SearchOptions } from '../utils/types.js';

/**
 * Extract post URNs from search results page
 */
const extractPostUrns = async (page: Page): Promise<string[]> => {
  const allUrns: string[] = await page.$$eval('div[data-view-tracking-scope]', (divs) => {
    const urns = new Set<string>();
    for (const d of divs) {
      const tracking = d.getAttribute('data-view-tracking-scope');
      if (!tracking) continue;
      try {
        const parsed = JSON.parse(tracking);
        const urn = (parsed as any)?.[0]?.breadcrumb?.updateUrn as string | undefined;
        if (urn) urns.add(urn);
      } catch (_) {
        // Ignore JSON parse errors
      }
    }
    return Array.from(urns);
  });
  
  return allUrns;
};

/**
 * Scroll and load more search results
 */
const loadMoreResults = async (page: Page, pagination: number): Promise<void> => {
  for (let i = 0; i < pagination; i++) {
    await page.keyboard.press('End');
    await page.waitForTimeout(1200);
  }
};

/**
 * Process a single post (extract content)
 */
const processPost = async (
  context: BrowserContext,
  urn: string,
  index: number,
  total: number
): Promise<PostResult> => {
  const url = buildPostUrl(urn);
  let postPage: Page | null = null;
  
  try {
    console.error(`[${index + 1}/${total}] Processing: ${urn}`);
    postPage = await context.newPage();
    await postPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
    
    const result = await extractPostContent(postPage, url, urn);
    
    if (result.description.startsWith('[')) {
      console.error(`⚠️  [${index + 1}] Warning: ${result.description} for ${urn}`);
    } else {
      console.error(`✅ [${index + 1}] Successfully processed: ${urn}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [${index + 1}] Failed to process ${urn}:`, error instanceof Error ? error.message : error);
    return {
      link: url,
      description: '[Post processing failed - page may not have loaded]'
    };
  } finally {
    if (postPage) {
      try { await postPage.close(); } catch (_) {}
    }
  }
};

/**
 * Process multiple posts concurrently
 */
const processPostsConcurrently = async (
  context: BrowserContext,
  urns: string[],
  concurrency: number
): Promise<PostResult[]> => {
  const tasks = urns.map((urn, index) => ({ urn, index }));
  const results: PostResult[] = new Array(tasks.length);
  const queue = [...tasks];
  
  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      
      results[item.index] = await processPost(
        context,
        item.urn,
        item.index,
        tasks.length
      );
    }
  };
  
  // Run workers concurrently
  await Promise.allSettled(
    Array.from({ length: concurrency }, () => worker())
  );
  
  return results;
};

/**
 * Perform LinkedIn post search
 * This is the core function that handles the entire search process
 * NO database operations - returns pure results
 */
const performSearch = async (
  context: BrowserContext,
  keywords: string,
  pagination: number,
  options: SearchOptions
): Promise<PostResult[]> => {
  const page = await context.newPage();
  const { concurrency = 8 } = options;
  
  try {
    // Navigate to search results with filters applied
    const searchUrl = buildSearchUrl(keywords);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for search results to load
    await page.waitForSelector('[data-view-tracking-scope]', { timeout: 0 }).catch(() => {});
    
    // Scroll to load more results
    await loadMoreResults(page, pagination);
    
    // Extract post URNs
    const urns = await extractPostUrns(page);
    const uniqueUrns = Array.from(new Set(urns));
    
    if (uniqueUrns.length === 0) {
      console.error('No posts found in search results');
      return [];
    }
    
    console.error(`Found ${uniqueUrns.length} unique posts to process`);
    
    // Process posts concurrently
    const actualConcurrency = Math.min(concurrency, uniqueUrns.length);
    const results = await processPostsConcurrently(
      context,
      uniqueUrns,
      actualConcurrency
    );
    
    // Log processing statistics
    const successCount = results.filter(r => !r.description.startsWith('[')).length;
    const failedCount = results.length - successCount;
    console.error(`\n📊 Processing complete: ${successCount} successful, ${failedCount} failed out of ${results.length} total posts`);
    
    return results;
  } finally {
    try { await page.close(); } catch (_) {}
  }
};

/**
 * Main search function - validates auth, launches browser, performs search
 * Returns post results without any database operations
 * 
 * @param keywords - Search keywords
 * @param pagination - Number of scroll pages to load (default: 3)
 * @param options - Search options (screenshots, concurrency)
 * @returns Array of post results
 * @throws Error if authentication is invalid or search fails
 */
export const searchLinkedInPosts = async (
  keywords: string,
  pagination: number = 3,
  options: SearchOptions = {}
): Promise<PostResult[]> => {
  // Validate authentication
  const authData = await loadAuthData();
  if (!authData || !await isAuthDataValid(authData)) {
    throw new Error('No valid LinkedIn authentication found. Please authenticate first.');
  }
  
  // Launch browser with saved auth
  const browser: Browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext({ storageState: authData });
  
  try {
    return await performSearch(context, keywords, pagination, options);
  } finally {
    await browser.close();
  }
};



