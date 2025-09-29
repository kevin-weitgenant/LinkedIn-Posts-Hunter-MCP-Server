import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { loadAuthData, isAuthDataValid } from '../auth/storage.js';
import { saveSearchResource } from '../utils/resource-storage.js';

export interface SearchPostsParams {
  keywords: string;
  pagination?: number;
}

export interface PostResult {
  link: string;
  description: string;
}

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
    // Navigate to LinkedIn feed
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

    // Perform search
    const searchInput = page.locator('input[aria-label="Search"], input[placeholder*="Search"]');
    await searchInput.first().waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.first().click();
    await searchInput.first().fill(keywords);
    await page.keyboard.press('Enter');

    // Wait for search results
    await page.waitForURL('**/search/results/**', { timeout: 30000 }).catch(() => {});

    // Apply filters for posts only
    await page
      .getByRole("button", { name: "Show all filters. Clicking" })
      .click();
    await page
      .getByRole("button", { name: "Showing results of type:" })
      .click();
    await page
      .getByRole("button", { name: "Show only results of type: Posts" })
      .click();
    await page
      .locator("label")
      .filter({ hasText: "Past month Filter by Past" })
      .click();
    await page
      .getByRole("button", { name: "Apply current filters to show" })
      .click();

    // Scroll to load more results
    await page.waitForSelector('[data-view-tracking-scope]', { timeout: 20000 }).catch(() => {});
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
          postPage = await context.newPage();
          await postPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await postPage
            .waitForSelector('div.update-components-text.relative.update-components-update-v2__commentary', { timeout: 12000 })
            .catch(() => {});
          
          const description: string = await postPage.$$eval(
            'div.update-components-text.relative.update-components-update-v2__commentary',
            (divs) =>
              divs
                .map((d) => (d.textContent || '').replace(/\s+/g, ' ').trim())
                .filter((t) => t.length > 0)
                .join('\n\n')
          );
          
          results[item.index] = { link: url, description };
        } catch (_) {
          results[item.index] = { link: url, description: '' };
        } finally {
          if (postPage) {
            try { await postPage.close(); } catch (_) {}
          }
        }
      }
    };

    await Promise.allSettled(Array.from({ length: concurrency }, () => worker()));
    
    // Filter out empty results
    return results.filter(r => r.description.length > 0);
    
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

      // Save results as CSV resource
      let resourceInfo = '';
      try {
        const metadata = await saveSearchResource(results, keywords);
        resourceInfo = `\n\nResults saved as resource: ${metadata.filename}`;
      } catch (error) {
        console.warn('Failed to save search resource:', error);
        resourceInfo = '\n\n(Note: Failed to save results as resource)';
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
