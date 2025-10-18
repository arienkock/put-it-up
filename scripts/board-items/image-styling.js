export function setImageStyles(image, container, shouldAnimateMove, isSelected, boardOrigin) {
  if (!image || !container) return;
  
  // Position the container
  const x = image.location.x - boardOrigin.x;
  const y = image.location.y - boardOrigin.y;
  
  container.style.left = x + "px";
  container.style.top = y + "px";
  container.style.width = image.width + "px";
  container.style.height = image.height + "px";
  
  // Set the image source
  container.image.src = image.dataUrl;
  
  // Handle selection state
  if (isSelected) {
    container.classList.add("selected");
    // Show resize handles
    const handles = container.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.style.opacity = "1";
    });
  } else {
    container.classList.remove("selected");
    // Hide resize handles
    const handles = container.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.style.opacity = "0";
    });
  }
  
  // Handle animation
  if (shouldAnimateMove) {
    container.style.transition = "left 0.2s ease, top 0.2s ease";
  } else {
    container.style.transition = "none";
  }
}
