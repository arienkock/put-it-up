/**
 * Fits text content within a sticky note by adjusting font size and textarea rows
 * Uses an iterative algorithm to find the best fit
 * Starts with 3rem font size and ranges from 0.5rem (minimum) to 7.5rem (maximum for large stickies)
 * 
 * @param {HTMLElement} sticky - The sticky note container element
 * @param {HTMLTextAreaElement} textarea - The textarea element containing the text
 */
export function fitContentInSticky(sticky, textarea) {
  textarea.rows = 1;
  textarea.style.fontSize = "3rem";
  let fontSize = 3.0;
  const wordMatches = textarea.value.match(/\S+/g);
  const numWords = wordMatches === null ? 0 : wordMatches.length;
  
  // First pass: try to fit with current settings
  while (true) {
    let adjusted = false;
    
    if (textarea.rows < numWords || textarea.value.length > 15) {
      if (
        textarea.scrollHeight > textarea.clientHeight &&
        sticky.scrollHeight <= sticky.clientHeight
      ) {
        textarea.rows++;
        adjusted = true;
      }
      if (sticky.scrollHeight > sticky.clientHeight) {
        textarea.rows--;
        adjusted = false;
      }
    }
    
    if (textarea.scrollHeight > textarea.clientHeight && fontSize > 0.5) {
      adjusted = true;
      fontSize -= 0.1;
      textarea.style.fontSize = fontSize + "rem";
    }
    
    if (!adjusted) {
      break;
    }
  }
  
  // Second pass: optimize for larger sizes - try increasing font size if there's extra space
  while (sticky.scrollHeight < sticky.clientHeight && fontSize < 7.5) {
    fontSize += 0.1;
    textarea.style.fontSize = fontSize + "rem";
    
    // If increasing font size causes overflow, revert and stop
    if (sticky.scrollHeight > sticky.clientHeight) {
      fontSize -= 0.1;
      textarea.style.fontSize = fontSize + "rem";
      break;
    }
  }
}
