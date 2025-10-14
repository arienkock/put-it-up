import { calculateEdgePoint } from "./connector-dom.js";

export const ARROW_HEAD_TYPES = ["line", "hollow", "filled"];

/**
 * Sets the styles and position of a connector
 * 
 * @param {Object} connector - Connector data object
 * @param {HTMLElement} container - Container element
 * @param {Object} originSticky - Origin sticky data
 * @param {Object} destSticky - Destination sticky data
 * @param {boolean} isSelected - Whether connector is selected
 * @param {Object} boardOrigin - Board origin {x, y}
 * @param {number} stickySize - Base size of stickies
 */
export function setConnectorStyles(
  connector,
  container,
  originSticky,
  destSticky,
  isSelected,
  boardOrigin,
  stickySize
) {
  const arrowHeadType = connector.arrowHead || "filled";
  
  // Calculate center points of stickies
  const originCenter = {
    x: originSticky.location.x - boardOrigin.x + stickySize / 2,
    y: originSticky.location.y - boardOrigin.y + stickySize / 2,
  };
  
  const destCenter = {
    x: destSticky.location.x - boardOrigin.x + stickySize / 2,
    y: destSticky.location.y - boardOrigin.y + stickySize / 2,
  };
  
  // Calculate edge points
  const startPoint = calculateEdgePoint(
    originCenter.x,
    originCenter.y,
    destCenter.x,
    destCenter.y,
    stickySize
  );
  
  const endPoint = calculateEdgePoint(
    destCenter.x,
    destCenter.y,
    originCenter.x,
    originCenter.y,
    stickySize
  );
  
  // Calculate bounding box for the SVG
  const minX = Math.min(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const maxX = Math.max(startPoint.x, endPoint.x);
  const maxY = Math.max(startPoint.y, endPoint.y);
  
  // Add padding for arrow head
  const padding = 20;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  
  // Position container
  container.style.position = "absolute";
  container.style.left = (minX - padding) + "px";
  container.style.top = (minY - padding) + "px";
  container.style.width = width + "px";
  container.style.height = height + "px";
  container.style.pointerEvents = "auto";
  
  // Set SVG dimensions
  const svg = container.svg;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  
  // Calculate local coordinates for the path
  const localStartX = startPoint.x - minX + padding;
  const localStartY = startPoint.y - minY + padding;
  const localEndX = endPoint.x - minX + padding;
  const localEndY = endPoint.y - minY + padding;
  
  // Update arrow head marker
  updateArrowHeadMarker(container.defs, arrowHeadType, isSelected);
  
  // Draw the path
  const pathData = `M ${localStartX} ${localStartY} L ${localEndX} ${localEndY}`;
  container.path.setAttribute("d", pathData);
  container.path.setAttribute("marker-end", `url(#arrowhead-${arrowHeadType})`);
  
  // Update selection state
  if (isSelected) {
    container.classList.add("selected");
    container.path.setAttribute("stroke", "#4646d8");
    container.path.setAttribute("stroke-width", "3");
  } else {
    container.classList.remove("selected");
    container.path.setAttribute("stroke", "#444");
    container.path.setAttribute("stroke-width", "2");
  }
}

/**
 * Updates or creates the arrow head marker in the SVG defs
 */
function updateArrowHeadMarker(defs, arrowHeadType, isSelected) {
  const markerId = `arrowhead-${arrowHeadType}`;
  let marker = defs.querySelector(`#${markerId}`);
  
  if (!marker) {
    marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    defs.appendChild(marker);
  }
  
  // Clear existing content
  marker.innerHTML = "";
  
  const color = isSelected ? "#4646d8" : "#444";
  
  // Create arrow head based on type
  switch (arrowHeadType) {
    case "line": {
      // Simple line arrow (two lines forming a V)
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 0 0 L 6 3 L 0 6");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      marker.appendChild(path);
      break;
    }
    case "hollow": {
      // Hollow triangle
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 0 0 L 6 3 L 0 6 Z");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "white");
      marker.appendChild(path);
      break;
    }
    case "filled": {
      // Filled triangle
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 0 0 L 6 3 L 0 6 Z");
      path.setAttribute("fill", color);
      marker.appendChild(path);
      break;
    }
  }
}
