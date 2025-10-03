import { loadAuthData, isAuthDataValid, clearAuthData, getAuthStatus } from '../auth/storage.js';
import { performAuthentication } from '../auth/browser.js';

export interface AuthParams {
  action: 'authenticate' | 'status' | 'clear';
  force_reauth?: boolean;
}

/**
 * Handle LinkedIn authentication MCP tool - unified handler for all auth operations
 */
export const handleLinkedInAuth = async (params: AuthParams) => {
  const { action, force_reauth = false } = params;

  try {
    switch (action) {
      case 'authenticate':
        return await handleAuthenticate(force_reauth);
        
      case 'status':
        return await handleAuthStatus();
        
      case 'clear':
        return await handleClearAuth();
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Authentication ${action} error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
};

/**
 * Perform LinkedIn authentication
 */
async function handleAuthenticate(force_reauth: boolean) {
  // Check if auth already exists and is valid (unless forced)
  if (!force_reauth) {
    const existing = await loadAuthData();
    if (existing && await isAuthDataValid(existing)) {
      return {
        content: [{
          type: "text",
          text: "LinkedIn authentication already exists and is valid. Use force_reauth=true to re-authenticate."
        }]
      };
    }
  }

  // Clear existing auth if force re-auth
  if (force_reauth) {
    await clearAuthData();
  }

  // Perform authentication flow
  const result = await performAuthentication();
  
  if (result.success) {
    return {
      content: [{
        type: "text",
        text: `LinkedIn authentication completed successfully! (${result.reason})\nCredentials have been saved and will be used for future LinkedIn operations.`
      }]
    };
  } else {
    return {
      content: [{
        type: "text", 
        text: `LinkedIn authentication failed or was cancelled.${result.error ? `\nError: ${result.error}` : ''}`
      }]
    };
  }
}

/**
 * Get LinkedIn authentication status
 */
async function handleAuthStatus() {
  const status = await getAuthStatus();
  
  if (!status.hasAuth) {
    return {
      content: [{
        type: "text",
        text: "No LinkedIn authentication found. Run the auth tool with action='authenticate' to log in."
      }]
    };
  }

  let statusText = "LinkedIn Authentication Status:\n";
  statusText += `• Has credentials: ${status.hasAuth ? '✓' : '✗'}\n`;
  statusText += `• Is valid: ${status.isValid ? '✓' : '✗'}\n`;
  
  if (status.createdAt) {
    statusText += `• Created: ${status.createdAt.toLocaleString()}\n`;
  }
  
  if (status.lastValidated) {
    statusText += `• Last validated: ${status.lastValidated.toLocaleString()}\n`;
  }
  
  if (status.age) {
    statusText += `• Age: ${status.age}\n`;
  }

  if (!status.isValid) {
    statusText += "\n⚠️  Authentication may be expired or invalid. Consider re-authenticating.";
  }

  return {
    content: [{
      type: "text",
      text: statusText
    }]
  };
}

/**
 * Clear LinkedIn authentication
 */
async function handleClearAuth() {
  const status = await getAuthStatus();
  
  if (!status.hasAuth) {
    return {
      content: [{
        type: "text",
        text: "No LinkedIn authentication found to clear."
      }]
    };
  }

  await clearAuthData();

  return {
    content: [{
      type: "text",
      text: "LinkedIn authentication has been cleared. You will need to re-authenticate for future operations."
    }]
  };
}
