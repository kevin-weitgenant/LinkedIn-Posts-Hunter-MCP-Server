import { loadAuthData, isAuthDataValid, clearAuthData, getAuthStatus } from '../auth/storage.js';
import { performAuthentication } from '../auth/browser.js';

export interface AuthenticateParams {
  force_reauth?: boolean;
}

export interface AuthStatusParams {
  // No parameters needed
}

/**
 * Handle LinkedIn authentication MCP tool
 */
export const handleLinkedInAuthenticate = async (params: AuthenticateParams = {}) => {
  const { force_reauth = false } = params;
  
  try {
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
    
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
};

/**
 * Handle LinkedIn authentication status MCP tool
 */
export const handleLinkedInAuthStatus = async (params: AuthStatusParams = {}) => {
  try {
    const status = await getAuthStatus();
    
    if (!status.hasAuth) {
      return {
        content: [{
          type: "text",
          text: "No LinkedIn authentication found. Run the linkedin_authenticate tool to log in."
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
    
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error checking authentication status: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
};

/**
 * Handle LinkedIn clear authentication MCP tool
 */
export const handleLinkedInClearAuth = async () => {
  try {
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
    
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error clearing authentication: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
};
