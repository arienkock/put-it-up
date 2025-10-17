import { calculateEdgePoint } from "./connector-dom.js";

export const ARROW_HEAD_TYPES = ["line", "hollow", "filled"];

/**
 * Sets the styles and position of a connector
 * 
 * @param {Object} connector - Connector data object
 * @param {HTMLElement} container - Container element
 * @param {Object} originSticky - Origin sticky data (null if unconnected)
 * @param {Object} destSticky - Destination sticky data (null if unconnected)
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
  stickySize,
  connectorId
) {
  const arrowHeadType = connector.arrowHead || "filled";
  
  // Calculate start and end points
  let startPoint, endPoint;
  
  if (originSticky) {
    // Connected to sticky
    const originSizeX = (originSticky.size && originSticky.size.x) || 1;
    const originSizeY = (originSticky.size && originSticky.size.y) || 1;
    const originCenter = {
      x: originSticky.location.x - boardOrigin.x + (stickySize * originSizeX) / 2,
      y: originSticky.location.y - boardOrigin.y + (stickySize * originSizeY) / 2,
    };
    
    if (destSticky) {
      // Both endpoints connected to stickies
      const destSizeX = (destSticky.size && destSticky.size.x) || 1;
      const destSizeY = (destSticky.size && destSticky.size.y) || 1;
      const destCenter = {
        x: destSticky.location.x - boardOrigin.x + (stickySize * destSizeX) / 2,
        y: destSticky.location.y - boardOrigin.y + (stickySize * destSizeY) / 2,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        Math.max(stickySize * originSizeX, stickySize * originSizeY)
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        originCenter.x,
        originCenter.y,
        Math.max(stickySize * destSizeX, stickySize * destSizeY)
      );
    } else {
      // Origin connected, destination unconnected
      const destPoint = connector.destinationPoint || { x: 0, y: 0 };
      const destCenter = {
        x: destPoint.x - boardOrigin.x,
        y: destPoint.y - boardOrigin.y,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        Math.max(stickySize * originSizeX, stickySize * originSizeY)
      );
      
      endPoint = destCenter;
    }
  } else {
    // Origin unconnected
    const originPoint = connector.originPoint || { x: 0, y: 0 };
    startPoint = {
      x: originPoint.x - boardOrigin.x,
      y: originPoint.y - boardOrigin.y,
    };
    
    if (destSticky) {
      // Origin unconnected, destination connected
      const destSizeX = (destSticky.size && destSticky.size.x) || 1;
      const destSizeY = (destSticky.size && destSticky.size.y) || 1;
      const destCenter = {
        x: destSticky.location.x - boardOrigin.x + (stickySize * destSizeX) / 2,
        y: destSticky.location.y - boardOrigin.y + (stickySize * destSizeY) / 2,
      };
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        startPoint.x,
        startPoint.y,
        Math.max(stickySize * destSizeX, stickySize * destSizeY)
      );
    } else {
      // Both endpoints unconnected
      const destPoint = connector.destinationPoint || { x: 0, y: 0 };
      endPoint = {
        x: destPoint.x - boardOrigin.x,
        y: destPoint.y - boardOrigin.y,
      };
    }
  }
  
  // Calculate bounding box for the SVG
  const minX = Math.min(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const maxX = Math.max(startPoint.x, endPoint.x);
  const maxY = Math.max(startPoint.y, endPoint.y);
  
  // Add padding for arrow head and handles
  const strokeWidth = 4;
  const markerExtension = 6 * strokeWidth;
  const handleSize = 8; // Size of unconnected endpoint handles
  const padding = Math.max(50, markerExtension + handleSize + 10);
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  
  // Position container
  container.style.position = "absolute";
  container.style.left = (minX - padding) + "px";
  container.style.top = (minY - padding) + "px";
  container.style.width = width + "px";
  container.style.height = height + "px";
  container.style.pointerEvents = "none"; // Don't capture clicks on empty areas
  
  // Set SVG dimensions
  const svg = container.svg;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.pointerEvents = "none"; // Ensure SVG doesn't capture pointer events
  
  // Calculate local coordinates for the path
  const localStartX = startPoint.x - minX + padding;
  const localStartY = startPoint.y - minY + padding;
  const localEndX = endPoint.x - minX + padding;
  const localEndY = endPoint.y - minY + padding;
  
  // Update arrow head marker
  const connectorColor = connector.color || "#000000";
  const markerId = updateArrowHeadMarker(container.defs, arrowHeadType, isSelected, connectorColor, connectorId);
  
  // Draw the path
  const pathData = `M ${localStartX} ${localStartY} L ${localEndX} ${localEndY}`;
  container.path.setAttribute("d", pathData);
  container.path.setAttribute("marker-end", `url(#${markerId})`);
  container.path.style.pointerEvents = "all"; // Allow clicks on the path
  
  // Add handles for unconnected endpoints
  updateConnectorHandles(container, connector, localStartX, localStartY, localEndX, localEndY, isSelected);
  
  // Update selection state and color
  if (isSelected) {
    container.classList.add("selected");
    container.path.setAttribute("stroke", "#4646d8");
    container.path.setAttribute("stroke-width", "4");
  } else {
    container.classList.remove("selected");
    container.path.setAttribute("stroke", connectorColor);
    container.path.setAttribute("stroke-width", "4");
  }
}

/**
 * Updates or creates handles for unconnected connector endpoints
 */
function updateConnectorHandles(container, connector, localStartX, localStartY, localEndX, localEndY, isSelected) {
  const svg = container.svg;
  
  // Remove existing handles
  const existingHandles = svg.querySelectorAll('.connector-handle');
  existingHandles.forEach(handle => handle.remove());
  
  const handleSize = 8;
  const color = isSelected ? "#4646d8" : "#000000";
  
  // Add handle for unconnected origin
  if (!connector.originId) {
    const originHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    originHandle.classList.add("connector-handle");
    originHandle.classList.add("origin-handle");
    originHandle.setAttribute("cx", localStartX);
    originHandle.setAttribute("cy", localStartY);
    originHandle.setAttribute("r", handleSize / 2);
    originHandle.setAttribute("fill", color);
    originHandle.setAttribute("stroke", "white");
    originHandle.setAttribute("stroke-width", "2");
    originHandle.setAttribute("cursor", "grab");
    originHandle.style.pointerEvents = "all";
    svg.appendChild(originHandle);
  }
  
  // Add handle for unconnected destination
  if (!connector.destinationId) {
    const destHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    destHandle.classList.add("connector-handle");
    destHandle.classList.add("destination-handle");
    destHandle.setAttribute("cx", localEndX);
    destHandle.setAttribute("cy", localEndY);
    destHandle.setAttribute("r", handleSize / 2);
    destHandle.setAttribute("fill", color);
    destHandle.setAttribute("stroke", "white");
    destHandle.setAttribute("stroke-width", "2");
    destHandle.setAttribute("cursor", "grab");
    destHandle.style.pointerEvents = "all";
    svg.appendChild(destHandle);
  }
}

/**
 * Updates or creates the arrow head marker in the SVG defs
 * @param {HTMLElement} defs - SVG defs element
 * @param {string} arrowHeadType - Type of arrow head (line, hollow, filled)
 * @param {boolean} isSelected - Whether the connector is selected
 * @param {string} connectorColor - The color of the connector
 * @param {string} connectorId - The unique ID of the connector
 * @returns {string} The marker ID
 */
function updateArrowHeadMarker(defs, arrowHeadType, isSelected, connectorColor, connectorId) {
  const markerId = `arrowhead-${connectorId}-${arrowHeadType}-${isSelected ? 'selected' : 'unselected'}`;
  let marker = defs.querySelector(`#${markerId}`);
  
  // Clean up old markers for this connector (different selection states or arrow types)
  const oldMarkers = defs.querySelectorAll(`[id^="arrowhead-${connectorId}-"]`);
  oldMarkers.forEach(oldMarker => {
    if (oldMarker.id !== markerId) {
      oldMarker.remove();
    }
  });
  
  if (!marker) {
    marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "5");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    defs.appendChild(marker);
  }
  
  // Clear existing content
  marker.innerHTML = "";
  
  const color = isSelected ? "#4646d8" : connectorColor;
  
  // Create arrow head based on type
  switch (arrowHeadType) {
    case "line": {
      // Simple line arrow (two lines forming a V)
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("marker-path");
      path.setAttribute("d", "M 0 2 L 6 5 L 0 8");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      path.style.pointerEvents = "all"; // Allow clicks on marker path
      marker.appendChild(path);
      break;
    }
    case "hollow": {
      // Hollow triangle
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("marker-path");
      path.setAttribute("d", "M 0 2 L 6 5 L 0 8 Z");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "white");
      path.style.pointerEvents = "all"; // Allow clicks on marker path
      marker.appendChild(path);
      break;
    }
    case "filled": {
      // Filled triangle
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("marker-path");
      path.setAttribute("d", "M 0 2 L 6 5 L 0 8 Z");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", color);
      path.style.pointerEvents = "all"; // Allow clicks on marker path
      marker.appendChild(path);
      break;
    }
  }
  
  return markerId;
}
