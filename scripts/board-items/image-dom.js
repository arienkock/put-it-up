export function createImageContainerDOM(imageIdClass) {
  const container = document.createElement("div");
  container.className = `image-container ${imageIdClass}`;
  container.style.position = "absolute";
  container.style.cursor = "grab";
  
  const img = document.createElement("img");
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.pointerEvents = "none";
  
  container.appendChild(img);
  
  // Add resize handles
  const handles = ['top', 'right', 'bottom', 'left'];
  handles.forEach(side => {
    const handle = document.createElement("div");
    handle.className = `resize-handle resize-handle-${side}`;
    handle.style.position = "absolute";
    handle.style.backgroundColor = "#4646d8";
    handle.style.border = "1px solid white";
    handle.style.opacity = "0";
    handle.style.transition = "opacity 0.2s";
    handle.style.pointerEvents = "auto"; // Ensure handles are clickable even when opacity is 0
    
    switch (side) {
      case 'top':
        handle.style.top = "-4px";
        handle.style.left = "50%";
        handle.style.transform = "translateX(-50%)";
        handle.style.width = "8px";
        handle.style.height = "8px";
        handle.style.cursor = "ns-resize";
        break;
      case 'right':
        handle.style.right = "-4px";
        handle.style.top = "50%";
        handle.style.transform = "translateY(-50%)";
        handle.style.width = "8px";
        handle.style.height = "8px";
        handle.style.cursor = "ew-resize";
        break;
      case 'bottom':
        handle.style.bottom = "-4px";
        handle.style.left = "50%";
        handle.style.transform = "translateX(-50%)";
        handle.style.width = "8px";
        handle.style.height = "8px";
        handle.style.cursor = "ns-resize";
        break;
      case 'left':
        handle.style.left = "-4px";
        handle.style.top = "50%";
        handle.style.transform = "translateY(-50%)";
        handle.style.width = "8px";
        handle.style.height = "8px";
        handle.style.cursor = "ew-resize";
        break;
    }
    
    container.appendChild(handle);
  });
  
  container.image = img;
  return container;
}

export function removePx(value) {
  return parseInt(value.replace("px", ""));
}
