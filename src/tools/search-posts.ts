import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { loadAuthData, isAuthDataValid } from '../auth/storage.js';
import { saveSearchResourceToDb } from '../utils/resource-storage.js';
import { getScreenshotsPath } from '../utils/paths.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface SearchPostsParams {
  keywords: string;
  pagination?: number;
}

export interface PostResult {
  link: string;
  description: string;
  screenshotPath?: string;
  profileImage?: string;
  authorName?: string;
  postDate?: string;
  likeCount?: string;
  commentCount?: string;
}

/**
 * Build LinkedIn content search URL with filters
 */
const buildSearchUrl = (keywords: string): string => {
  const encodedKeywords = encodeURIComponent(keywords);
  return `https://www.linkedin.com/search/results/content/?datePosted=%22past-month%22&keywords=${encodedKeywords}&origin=FACETED_SEARCH&sortBy=%22relevance%22`;
};

/**
 * Perform LinkedIn post search with authentication
 */
const performSearch = async (
  context: BrowserContext, 
  keywords: string, 
  pagination: number
): Promise<PostResult[]> => {
  const page = await context.newPage();
  
  try {
    // Navigate directly to search results with filters applied
    const searchUrl = buildSearchUrl(keywords);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for search results to load
    await page.waitForSelector('[data-view-tracking-scope]', { timeout: 0 }).catch(() => {});

    // Scroll to load more results
    const seenUrns = new Set<string>();
    
    for (let i = 0; i < pagination; i++) {
      await page.keyboard.press('End');
      await page.waitForTimeout(1200);
    }

    // Extract post URNs
    const allUrns: string[] = await page.$$eval('div[data-view-tracking-scope]', (divs) => {
      const urns = new Set<string>();
      for (const d of divs) {
        const tracking = d.getAttribute('data-view-tracking-scope');
        if (!tracking) continue;
        try {
          const parsed = JSON.parse(tracking);
          const urn = (parsed as any)?.[0]?.breadcrumb?.updateUrn as string | undefined;
          if (urn) urns.add(urn);
        } catch (_) {}
      }
      return Array.from(urns);
    });

    for (const u of allUrns) seenUrns.add(u);
    const uniqueUrns: string[] = Array.from(seenUrns);

    // Extract post content concurrently
    const tasks = uniqueUrns.map((urn, index) => ({ urn, index }));
    const results: PostResult[] = new Array(tasks.length);
    const concurrency = Math.min(8, tasks.length);
    const queue = [...tasks];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        
        const url = `https://www.linkedin.com/feed/update/${item.urn}/`;
        let postPage: Page | null = null;
        
        try {
          console.error(`[${item.index + 1}/${tasks.length}] Processing: ${item.urn}`);
          postPage = await context.newPage();
          await postPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
          
          // Wait for actual post description content to appear (not just the DOM element)
          await postPage.waitForFunction(
            () => {
              const el = document.querySelector('div.update-components-text.relative.update-components-update-v2__commentary');
              return el && el.textContent && el.textContent.trim().length > 10;
            },
            { timeout: 0 }
          );
          
          let description: string = '';
          try {
            description = await postPage.$$eval(
              'div.update-components-text.relative.update-components-update-v2__commentary',
              (divs) =>
                divs
                  .map((d) => (d.textContent || '').replace(/\s+/g, ' ').trim())
                  .filter((t) => t.length > 0)
                  .join('\n\n')
            );
            
            if (!description) {
              console.error(`⚠️  [${item.index + 1}] No description found for ${item.urn}, saving with placeholder`);
              description = '[No description content found]';
            }
          } catch (descError) {
            console.error(`❌ [${item.index + 1}] Failed to extract description for ${item.urn}:`, descError instanceof Error ? descError.message : descError);
            description = '[Description extraction failed]';
          }
          
          // Extract additional metadata using XPath selectors
          let profileImage: string | undefined;
          let authorName: string | undefined;
          let postDate: string | undefined;
          let likeCount: string | undefined;
          let commentCount: string | undefined;
          
          try {
            // Profile image
            const profileImageLocator = postPage.locator('xpath=//div[contains(@class, "ivm-view-attr__img-wrapper")]//img[contains(@class, "EntityPhoto-circle")]');
            if (await profileImageLocator.count() > 0) {
              profileImage = await profileImageLocator.first().getAttribute('src') || undefined;
            }
          } catch (_) {}
          
          try {
            // Author name
            const nameLocator = postPage.locator('xpath=//span[contains(@class, "update-components-actor__title")]//span[contains(@class, "hoverable-link-text")]');
            if (await nameLocator.count() > 0) {
              const rawName = await nameLocator.first().textContent() || '';
              const trimmed = rawName.trim();
              const halfLength = trimmed.length / 2;
              const isDuplicate = trimmed.length % 2 === 0 && 
                                  trimmed.substring(0, halfLength) === trimmed.substring(halfLength);
              authorName = isDuplicate ? trimmed.substring(0, halfLength).trim() : trimmed;
            }
          } catch (_) {}
          
          try {
            // Post date
            const dateLocator = postPage.locator('xpath=//span[contains(@class, "update-components-actor__sub-description")]//span[@aria-hidden="true"]');
            if (await dateLocator.count() > 0) {
              const rawDate = await dateLocator.first().textContent() || '';
              postDate = rawDate
                .replace(/•/g, '')
                .replace(/\bEdited\b/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            }
          } catch (_) {}
          
          try {
            // Like counter
            const likeLocator = postPage.locator('xpath=//span[contains(@class, "social-details-social-counts__reactions-count") and @aria-hidden="true"]');
            if (await likeLocator.count() > 0) {
              const rawLikes = await likeLocator.first().textContent() || '';
              likeCount = rawLikes.replace(/\s+/g, ' ').trim();
            }
          } catch (_) {}
          
          try {
            // Comments counter
            const commentLocator = postPage.locator('xpath=//span[@aria-hidden="true" and contains(normalize-space(.), "comments")]');
            if (await commentLocator.count() > 0) {
              const rawComments = await commentLocator.first().textContent() || '';
              commentCount = rawComments.replace(/\s+/g, ' ').trim();
            }
          } catch (_) {}
          
          // Capture screenshot of the post content
          let screenshotPath: string | undefined;
          try {
            const screenshotsDir = getScreenshotsPath();
            const timestamp = Date.now();
            // Sanitize URN for filename (remove special characters)
            const sanitizedUrn = item.urn.replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `post_${sanitizedUrn}_${timestamp}.png`;
            const fullPath = path.join(screenshotsDir, filename);
            
            // Try to screenshot the specific post element
            const postElement = await postPage.$('div.update-components-text.relative.update-components-update-v2__commentary');
            if (postElement) {
              await postElement.screenshot({ path: fullPath, type: 'png' });
              screenshotPath = `screenshots/${filename}`;
            }
          } catch (screenshotError) {
            // Log but don't fail - screenshot is optional
            console.error(`Failed to capture screenshot for ${item.urn}:`, screenshotError);
          }
          
          results[item.index] = { 
            link: url, 
            description, 
            screenshotPath,
            profileImage,
            authorName,
            postDate,
            likeCount,
            commentCount
          };
          console.error(`✅ [${item.index + 1}] Successfully processed: ${item.urn}`);
        } catch (error) {
          console.error(`❌ [${item.index + 1}] Failed to process ${item.urn}:`, error instanceof Error ? error.message : error);
          results[item.index] = { 
            link: url, 
            description: '[Post processing failed - page may not have loaded]' 
          };
        } finally {
          if (postPage) {
            try { await postPage.close(); } catch (_) {}
          }
        }
      }
    };

    await Promise.allSettled(Array.from({ length: concurrency }, () => worker()));
    
    // Return all results (including those with placeholder descriptions)
    const successCount = results.filter(r => !r.description.startsWith('[')).length;
    const failedCount = results.length - successCount;
    console.error(`\n📊 Processing complete: ${successCount} successful, ${failedCount} failed out of ${results.length} total posts`);
    
    return results;
    
  } finally {
    try { await page.close(); } catch (_) {}
  }
};

/**
 * Handle LinkedIn search posts MCP tool
 */
export const handleLinkedInSearchPosts = async (params: SearchPostsParams) => {
  const { keywords, pagination = 3 } = params;
  
  if (!keywords?.trim()) {
    return {
      content: [{
        type: "text",
        text: "Keywords parameter is required for searching LinkedIn posts."
      }]
    };
  }

  try {
    // Check authentication
    const authData = await loadAuthData();
    if (!authData || !await isAuthDataValid(authData)) {
      return {
        content: [{
          type: "text",
          text: "No valid LinkedIn authentication found. Please run the linkedin_authenticate tool first."
        }]
      };
    }

    // Launch browser with saved auth
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: authData });
    
    try {
      const results = await performSearch(context, keywords, pagination);
      
      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No LinkedIn posts found for keywords: "${keywords}"`
          }]
        };
      }

      // Save results to SQLite database
      let resourceInfo = '';
      try {
        const saveResult = await saveSearchResourceToDb(results, keywords);
        
        const dbPath = path.join(
          process.env.APPDATA || os.homedir(),
          'linkedin-mcp',
          'resources',
          'linkedin.db'
        );
        
        const statsInfo = saveResult.duplicatesSkipped > 0
          ? `${saveResult.newPostsAdded} new posts added, ${saveResult.duplicatesSkipped} duplicates skipped`
          : `${saveResult.newPostsAdded} new posts added`;
        
        resourceInfo = `\n\n💾 Results saved to database\n` +
                      `   ${statsInfo}\n` +
                      `   Total posts in database: ${saveResult.totalPosts}\n` +
                      `   Database: ${dbPath}`;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to save search results:', error);
        resourceInfo = `\n\n⚠️ Failed to save to database: ${errorMsg}`;
      }

      let responseText = `Found ${results.length} LinkedIn posts for "${keywords}":\n\n`;
      
      results.forEach((post, index) => {
        const preview = post.description.length > 200 
          ? post.description.substring(0, 200) + '...' 
          : post.description;
        
        responseText += `${index + 1}. ${post.link}\n`;
        responseText += `   ${preview}\n\n`;
      });

      responseText += resourceInfo;

      return {
        content: [{
          type: "text",
          text: responseText
        }]
      };
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching LinkedIn posts: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
};



// Test execution - run this file directly with: npx tsx src/tools/search-posts.ts
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = path.resolve(__filename) === path.resolve(process.argv[1]);

if (isMainModule) {
  console.log('🧪 Testing LinkedIn post search...\n');
  
  handleLinkedInSearchPosts({ 
    keywords: '"ai engineering" AND "junior" AND "remote"', 
    pagination: 2 
  })
    .then(result => {
      console.log('\n✅ Test completed!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}