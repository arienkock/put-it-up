/**
 * Fits text content within a sticky note by adjusting font size and textarea rows
 * Uses an iterative algorithm to find the best fit
 * Optimized for 70px sticky size - starts with 1.5rem font size and ranges from 0.5rem (minimum) to 5rem (maximum)
 * Smaller stickies will naturally use smaller font sizes due to overflow constraints
 * 
 * @param {HTMLElement} sticky - The sticky note container element
 * @param {HTMLTextAreaElement} textarea - The textarea element containing the text
 */
export function fitContentInSticky(sticky, textarea) {
  textarea.rows = 1;
  textarea.style.fontSize = "1.5rem"; // Reduced from 3rem for 70px stickies
  let fontSize = 1.5; // Reduced from 3.0 for 70px stickies
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
  
  // Ensure textarea fills available space when sticky is large
  // Increase rows until textarea fills the available height (accounting for vertical padding)
  // Calculate padding from computed styles to get actual values
  const computedStyle = window.getComputedStyle(sticky);
  const paddingTop = parseFloat(computedStyle.paddingTop) || 12;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 12;
  const totalVerticalPadding = paddingTop + paddingBottom;
  const availableHeight = sticky.clientHeight - totalVerticalPadding;
  
  // Measure the height per row by checking the difference when we add a row
  const initialRows = textarea.rows;
  const initialHeight = textarea.clientHeight;
  textarea.rows = initialRows + 1;
  const heightPerRow = textarea.clientHeight - initialHeight;
  textarea.rows = initialRows; // Reset
  
  if (heightPerRow > 0) {
    // Calculate target rows needed to fill available space
    // Use floor to ensure we leave some margin, which helps 1x1 stickies stay at 1 row
    const targetRows = Math.max(initialRows, Math.floor(availableHeight / heightPerRow));
    
    // Increase rows to fill space, but stop if we would overflow
    // Stop before completely filling to maintain some visual margin
    while (
      textarea.rows < targetRows &&
      textarea.clientHeight < availableHeight - heightPerRow * 0.5 && // Leave some margin
      sticky.scrollHeight <= sticky.clientHeight &&
      textarea.scrollHeight <= textarea.clientHeight
    ) {
      const rowsBefore = textarea.rows;
      textarea.rows++;
      // Safety checks to avoid infinite loops or excessive rows
      if (textarea.rows > 1000 || textarea.rows === rowsBefore) break;
      
      // Check if we've reached the target or would overflow
      if (sticky.scrollHeight > sticky.clientHeight || textarea.scrollHeight > textarea.clientHeight) {
        textarea.rows--;
        break;
      }
    }
  }
  
  // Second pass: optimize for larger sizes - maximize font size up to 5rem
  // Since flex layout controls textarea height, we can't reduce rows to compensate
  // Just keep increasing font size until we hit overflow
  while (fontSize < 5.0) {
    const fontSizeBefore = fontSize;
    
    // Try increasing font size
    fontSize += 0.1;
    textarea.style.fontSize = fontSize + "rem";
    
    // Check if this causes overflow - since flex controls height, overflow means we've gone too far
    if (sticky.scrollHeight > sticky.clientHeight || textarea.scrollHeight > textarea.clientHeight) {
      // Overflow occurred - revert and stop
      fontSize = fontSizeBefore;
      textarea.style.fontSize = fontSize + "rem";
      break;
    }
    
    // If we successfully increased without overflow, continue to next iteration
  }
}
