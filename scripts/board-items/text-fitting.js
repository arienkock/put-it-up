/**
 * Fits text content within a sticky note by adjusting font size and textarea rows
 * Uses an iterative algorithm to find the best fit
 * 
 * @param {HTMLElement} sticky - The sticky note container element
 * @param {HTMLTextAreaElement} textarea - The textarea element containing the text
 */
export function fitContentInSticky(sticky, textarea) {
  textarea.rows = 1;
  textarea.style.fontSize = "1.5rem";
  let fontSize = 1.5;
  const wordMatches = textarea.value.match(/\S+/g);
  const numWords = wordMatches === null ? 0 : wordMatches.length;
  
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
}
