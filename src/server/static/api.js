import { showLoading, showError, showStatus } from './ui.js';
import { state, setState } from './state.js';
import { renderPostTable, showPostInfo } from './ui.js';

/**
 * Load all posts from database
 */
export async function loadPosts() {
    try {
        showLoading(true);

        const response = await fetch('/api/posts');
        
        if (!response.ok) {
            throw new Error(`Failed to load posts: ${response.statusText}`);
        }

        const posts = await response.json();
        
        setState({
            currentData: posts,
            hasUnsavedChanges: false,
        });

        renderPostTable();
        showPostInfo();
        showStatus(`Loaded ${posts.length} posts from database`, 'success');

    } catch (error) {
        showError('Failed to load posts: ' + error.message);
    } finally {
        showLoading(false);
    }
}


/**
 * Save changes back to database
 */
export async function saveChanges() {
    if (!state.currentData || state.currentData.length === 0) {
        showError('No data to save.');
        return;
    }

    try {
        showStatus('Saving changes...', 'info');

        const response = await fetch('/api/posts/bulk-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(state.currentData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save changes');
        }

        setState({ hasUnsavedChanges: false });
        document.getElementById('saveBtn').disabled = true;

        // Clear modified styling
        document.querySelectorAll('.modified').forEach(cell => {
            cell.classList.remove('modified');
        });

        showStatus('Changes saved successfully', 'success');

    } catch (error) {
        showError(`Failed to save changes: ${error.message}`);
    }
}

/**
 * Delete a post from database by ID
 */
export async function deletePost(postId) {
    try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete post');
        }

        // Reload posts from database
        await loadPosts();

        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Toggle applied status for a post
 */
export async function toggleAppliedStatus(postId, applied) {
    try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/applied`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ applied }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update applied status');
        }

        const result = await response.json();
        return result.applied;
    } catch (error) {
        throw error;
    }
}