import { chromium, Browser, BrowserContext, Page } from "playwright";
import { saveAuthData } from './storage.js';

export interface AuthBrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Launch browser for LinkedIn authentication
 */
export const launchAuthBrowser = async (): Promise<AuthBrowserSession> => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set generous timeouts for auth flow
  page.setDefaultNavigationTimeout(0);
  page.setDefaultTimeout(0);

  return { browser, context, page };
};

/**
 * Navigate to LinkedIn login page
 */
export const navigateToLogin = async (page: Page): Promise<void> => {
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });
};

/**
 * Check if URL looks like LinkedIn feed
 */
export const looksLikeFeed = (url: string): boolean => {
  return /linkedin\.com\/feed/.test(url);
};

/**
 * Check if context has LinkedIn authentication cookie
 */
export const hasLinkedInCookie = async (context: BrowserContext): Promise<boolean> => {
  try {
    const cookies = await context.cookies(["https://www.linkedin.com"]);
    return cookies.some((c) => c.name === "li_at");
  } catch {
    return false;
  }
};

/**
 * Set up authentication detection and auto-save
 */
export const setupAuthDetection = (
  page: Page, 
  context: BrowserContext,
  onAuthDetected: (reason: string) => Promise<void>
): { cleanup: () => void } => {
  let saved = false;
  let interval: NodeJS.Timeout;

  const saveOnce = async (reason: string): Promise<void> => {
    if (saved) return;
    try {
      const storageState = await context.storageState();
      await saveAuthData(storageState);
      saved = true;
      await onAuthDetected(reason);
    } catch (e) {
      // ignore save errors during auth flow
    }
  };

  // Event listeners for navigation-based detection
  const handleFrameNavigation = async (frame: any) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (looksLikeFeed(url)) {
        await saveOnce("navigated-to-feed");
      }
    }
  };

  const handleDOMContentLoaded = async () => {
    if (looksLikeFeed(page.url())) {
      await saveOnce("domcontentloaded-on-feed");
    }
  };

  const handlePageClose = () => {
    cleanup();
  };

  // Set up event listeners
  page.on("framenavigated", handleFrameNavigation);
  page.on("domcontentloaded", handleDOMContentLoaded);
  page.on("close", handlePageClose);

  // Periodic cookie checking
  interval = setInterval(async () => {
    if (saved) return;
    try {
      const hasCookie = await hasLinkedInCookie(context);
      const onFeed = looksLikeFeed(page.url());
      
      if (hasCookie || onFeed) {
        await saveOnce(hasCookie ? "li_at-cookie-detected" : "feed-url-detected");
      }
    } catch {
      // ignore errors during periodic checks
    }
  }, 1500);

  // Immediate check for already-authenticated scenarios
  if (looksLikeFeed(page.url())) {
    saveOnce("immediate-on-feed").catch(() => {});
  }

  const cleanup = () => {
    if (interval) clearInterval(interval);
    page.off("framenavigated", handleFrameNavigation);
    page.off("domcontentloaded", handleDOMContentLoaded);
    page.off("close", handlePageClose);
  };

  return { cleanup };
};

/**
 * Wait for user to complete authentication
 */
export const waitForAuthentication = async (page: Page): Promise<void> => {
  try {
    await page.waitForEvent("close");
  } catch {
    // Page might be already closed
  }
};

/**
 * Clean up browser session
 */
export const cleanupBrowser = async (session: AuthBrowserSession): Promise<void> => {
  const { browser, context } = session;
  
  try {
    await context.close();
  } catch {
    // ignore cleanup errors
  }
  
  try {
    await browser.close();
  } catch {
    // ignore cleanup errors
  }
};

/**
 * Complete authentication flow
 */
export const performAuthentication = async (): Promise<{
  success: boolean;
  reason?: string;
  error?: string;
}> => {
  let session: AuthBrowserSession | null = null;
  let authReason: string | undefined;
  
  try {
    session = await launchAuthBrowser();
    const { page, context } = session;
    
    await navigateToLogin(page);
    
    console.log("Please complete LinkedIn login (including any 2FA). The browser window will close automatically once authentication is detected.");
    
    const { cleanup } = setupAuthDetection(page, context, async (reason) => {
      authReason = reason;
      console.log(`Authentication successful! (${reason})`);
    });
    
    await waitForAuthentication(page);
    cleanup();
    
    return {
      success: !!authReason,
      reason: authReason
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    if (session) {
      await cleanupBrowser(session);
    }
  }
};
