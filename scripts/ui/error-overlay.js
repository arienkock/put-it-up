// Reusable error overlay component
export function showError(message, onRetry, title = 'Error') {
  const overlay = document.getElementById('error-overlay');
  const errorMessage = document.getElementById('error-message');
  const errorTitle = document.getElementById('error-title');
  const retryButton = document.getElementById('error-retry');
  
  errorTitle.textContent = title;
  
  // If message is an Error object, extract full details
  let displayMessage = message;
  if (message instanceof Error) {
    console.error('Error object passed to showError:', message);
    console.error('Error stack:', message.stack);
    console.error('Error details:', {
      name: message.name,
      message: message.message,
      stack: message.stack,
      code: message.code,
      fullError: message
    });
    
    displayMessage = [
      message.message || 'An error occurred.',
      message.stack ? `\n\nStack trace:\n${message.stack}` : '',
      message.code ? `\n\nError code: ${message.code}` : ''
    ].filter(Boolean).join('');
  } else if (typeof message === 'string') {
    displayMessage = message;
  } else {
    displayMessage = message || 'An error occurred.';
  }
  
  errorMessage.textContent = displayMessage;
  overlay.style.display = 'flex';
  
  // Show or hide retry button based on whether onRetry is provided
  if (onRetry) {
    retryButton.style.display = 'block';
    // Remove any existing handler and add new one
    const newRetryButton = retryButton.cloneNode(true);
    retryButton.parentNode.replaceChild(newRetryButton, retryButton);
    newRetryButton.addEventListener('click', onRetry);
  } else {
    retryButton.style.display = 'none';
  }
  
  return {
    updateMessage(newMsg) { 
      const msgEl = document.getElementById('error-message');
      if (msgEl) {
        // Handle Error objects in updateMessage too
        if (newMsg instanceof Error) {
          const errorDetails = [
            newMsg.message || 'An error occurred.',
            newMsg.stack ? `\n\nStack trace:\n${newMsg.stack}` : '',
            newMsg.code ? `\n\nError code: ${newMsg.code}` : ''
          ].filter(Boolean).join('');
          msgEl.textContent = errorDetails;
        } else {
          msgEl.textContent = newMsg;
        }
      }
    },
    hide() { 
      const overlayEl = document.getElementById('error-overlay');
      if (overlayEl) overlayEl.style.display = 'none'; 
    }
  };
}