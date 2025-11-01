import { initializeFirebaseApp, firebaseConfig } from '../config/firebase-config.js';
import { showError } from './error-overlay.js';

// Helper to format authentication error messages
export function formatAuthErrorMessage(error) {
  const code = error && error.code ? String(error.code) : '';
  const msg = error && error.message ? String(error.message) : '';
  if (code.includes('auth/unauthorized-domain')) {
    return 'Sign-in is not allowed from this domain. In Firebase Console → Authentication → Settings, add this origin (e.g. localhost:9000) to Authorized domains.';
  }
  if (msg.includes('404') || code.includes('404')) {
    return 'Authentication handler redirect failed. The redirect after sign-in returned a 404. This may indicate:\n- The redirect URL format is incorrect\n- A network or configuration issue\n\nPlease check the browser console for more details and ensure you are accessing the app from the correct URL (http://localhost:9000).';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completing. Please try again.';
  }
  return msg || 'Authentication failed. Please try again.';
}

// Ensure user is authenticated if online mode
export async function ensureAuthenticatedIfOnline(isOffline = false) {
  if (isOffline) {
    return null; // no auth required
  }
  
  // Initialize Firebase app if not already
  initializeFirebaseApp();
  const auth = firebase.auth();
  
  // Try to resolve a pending redirect result first (from prior session)
  try {
    const redirectResult = await auth.getRedirectResult();
    if (redirectResult && redirectResult.user) {
      return redirectResult.user;
    }
  } catch (e) {
    // ignore here; we'll show UI below if needed
  }
  
  // Wait for current auth state
  const currentUser = await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
  if (currentUser) {
    return currentUser;
  }
  
  // Attempt popup sign-in; on error, show UI and allow retries
  const provider = new firebase.auth.GoogleAuthProvider();
  async function attemptPopupSignIn() {
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      if (result && result.user) {
        return result.user;
      }
      throw new Error('Sign-in completed but no user returned');
    } catch (error) {
      // Check for popup blocked error - in this case, fall back to redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        // If popup is blocked, try redirect instead
        throw new Error('Popup was blocked. Please allow popups for this site and try again, or the browser may redirect you automatically.');
      }
      // Re-throw other errors
      throw error;
    }
  }

  try {
    const user = await attemptPopupSignIn();
    return user;
  } catch (e) {
    // Log detailed error info to help debug the 404 redirect issue
    if (window.DEBUG_MODE) {
      console.error('[Auth Error]', {
        code: e?.code,
        message: e?.message,
        email: e?.email,
        credential: e?.credential,
        error: e
      });
    }
    
    let overlay;
    const handleRetry = async () => {
      try {
        overlay.updateMessage('Retrying sign-in...');
        const user = await attemptPopupSignIn();
        overlay.hide();
        resolveRetry(user);
      } catch (err) {
        if (window.DEBUG_MODE) {
          console.error('[Auth Retry Error]', {
            code: err?.code,
            message: err?.message,
            error: err
          });
        }
        overlay.updateMessage(formatAuthErrorMessage(err));
      }
    };
    let resolveRetry;
    const userPromise = new Promise((resolve) => { resolveRetry = resolve; });
    overlay = showError(formatAuthErrorMessage(e), handleRetry, 'Sign-in required');
    return await userPromise;
  }
}