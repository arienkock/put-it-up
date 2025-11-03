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
  // Add iteration limit to prevent infinite loops during rapid input
  // Also cap maximum rows to prevent excessive expansion
  const maxRowsFirstPass = Math.min(Math.ceil(textarea.value.length / 15), 10); // Cap at 10 rows based on text length
  let iterations = 0;
  const maxIterations = 50; // Limit iterations to prevent blocking
  while (iterations < maxIterations) {
    iterations++;
    let adjusted = false;
    
    // Batch DOM reads to reduce layout thrashing
    const textareaScrollHeight = textarea.scrollHeight;
    const textareaClientHeight = textarea.clientHeight;
    const stickyScrollHeight = sticky.scrollHeight;
    const stickyClientHeight = sticky.clientHeight;
    
    if ((textarea.rows < numWords || textarea.value.length > 15) && textarea.rows < maxRowsFirstPass) {
      if (
        textareaScrollHeight > textareaClientHeight &&
        stickyScrollHeight <= stickyClientHeight
      ) {
        textarea.rows++;
        adjusted = true;
      }
      if (stickyScrollHeight > stickyClientHeight) {
        textarea.rows--;
        adjusted = false;
      }
    }
    
    if (textareaScrollHeight > textareaClientHeight && fontSize > 0.5) {
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
  
  // Limit maximum rows to prevent excessive expansion
  // For very long text, we should rely on scrolling rather than infinite rows
  // Calculate a reasonable max based on text length, but cap it strictly
  const estimatedRowsForText = Math.ceil(textarea.value.length / 20); // Rough estimate: ~20 chars per row
  const maxRows = Math.min(
    Math.max(initialRows, estimatedRowsForText),
    10 // Hard cap at 10 rows - beyond this, use scrolling
  );
  
  if (heightPerRow > 0) {
    // Calculate target rows needed to fill available space
    // Use floor to ensure we leave some margin, which helps 1x1 stickies stay at 1 row
    // But cap it at maxRows to prevent excessive expansion
    const targetRows = Math.min(
      Math.max(initialRows, Math.floor(availableHeight / heightPerRow)),
      maxRows // Cap at reasonable maximum based on text length
    );
    
    // Increase rows to fill space, but stop if we would overflow
    // Stop before completely filling to maintain some visual margin
    let rowFillingIterations = 0;
    const maxRowFillingIterations = 50; // Safety limit
    while (
      textarea.rows < targetRows &&
      textarea.clientHeight < availableHeight - heightPerRow * 0.5 && // Leave some margin
      sticky.scrollHeight <= sticky.clientHeight &&
      textarea.scrollHeight <= textarea.clientHeight &&
      rowFillingIterations < maxRowFillingIterations
    ) {
      rowFillingIterations++;
      const rowsBefore = textarea.rows;
      textarea.rows++;
      // Safety checks to avoid infinite loops or excessive rows
      if (textarea.rows > maxRows || textarea.rows === rowsBefore) break;
      
      // Batch DOM reads
      const stickyScrollHeight = sticky.scrollHeight;
      const stickyClientHeight = sticky.clientHeight;
      const textareaScrollHeight = textarea.scrollHeight;
      const textareaClientHeight = textarea.clientHeight;
      
      // Check if we've reached the target or would overflow
      if (stickyScrollHeight > stickyClientHeight || textareaScrollHeight > textareaClientHeight) {
        textarea.rows--;
        break;
      }
    }
  }
  
  // Second pass: optimize for larger sizes - maximize font size up to 5rem
  // Since flex layout controls textarea height, we can't reduce rows to compensate
  // Just keep increasing font size until we hit overflow
  // Add iteration limit to prevent excessive loops
  let fontSizeIterations = 0;
  const maxFontSizeIterations = 45; // (5.0 - 1.5) / 0.1 = 35, add margin
  while (fontSize < 5.0 && fontSizeIterations < maxFontSizeIterations) {
    fontSizeIterations++;
    const fontSizeBefore = fontSize;
    
    // Try increasing font size
    fontSize += 0.1;
    textarea.style.fontSize = fontSize + "rem";
    
    // Batch DOM reads
    const stickyScrollHeight = sticky.scrollHeight;
    const stickyClientHeight = sticky.clientHeight;
    const textareaScrollHeight = textarea.scrollHeight;
    const textareaClientHeight = textarea.clientHeight;
    
    // Check if this causes overflow - since flex controls height, overflow means we've gone too far
    if (stickyScrollHeight > stickyClientHeight || textareaScrollHeight > textareaClientHeight) {
      // Overflow occurred - revert and stop
      fontSize = fontSizeBefore;
      textarea.style.fontSize = fontSize + "rem";
      break;
    }
    
    // If we successfully increased without overflow, continue to next iteration
  }
}
