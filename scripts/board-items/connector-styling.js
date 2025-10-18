import { calculateEdgePoint } from "./connector-dom.js";

export const ARROW_HEAD_TYPES = ["none", "line", "hollow", "filled"];

/**
 * Sets the styles and position of a connector
 * 
 * @param {Object} connector - Connector data object
 * @param {HTMLElement} container - Container element
 * @param {Object} originSticky - Origin sticky data (null if unconnected)
 * @param {Object} destSticky - Destination sticky data (null if unconnected)
 * @param {Object} originImage - Origin image data (null if unconnected)
 * @param {Object} destImage - Destination image data (null if unconnected)
 * @param {boolean} isSelected - Whether connector is selected
 * @param {Object} boardOrigin - Board origin {x, y}
 * @param {number} stickySize - Base size of stickies
 */
export function setConnectorStyles(
  connector,
  container,
  originSticky,
  destSticky,
  originImage,
  destImage,
  isSelected,
  boardOrigin,
  stickySize,
  connectorId
) {
  const arrowHeadType = connector.arrowHead || "filled";
  
  // Validate inputs to prevent NaN errors
  if (!boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' || 
      isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
    console.warn('Invalid boardOrigin:', boardOrigin);
    return; // Skip rendering if board origin is invalid
  }
  
  if (typeof stickySize !== 'number' || isNaN(stickySize) || stickySize <= 0) {
    console.warn('Invalid stickySize:', stickySize);
    return; // Skip rendering if sticky size is invalid
  }
  
  // Calculate start and end points
  let startPoint, endPoint;
  
  if (originSticky) {
    // Connected to sticky
    // Validate sticky location coordinates
    if (!originSticky.location || typeof originSticky.location.x !== 'number' || typeof originSticky.location.y !== 'number' ||
        isNaN(originSticky.location.x) || isNaN(originSticky.location.y)) {
      console.warn('Invalid origin sticky location:', originSticky.location);
      return; // Skip rendering if sticky location is invalid
    }
    
    const originSizeX = (originSticky.size && originSticky.size.x) || 1;
    const originSizeY = (originSticky.size && originSticky.size.y) || 1;
    const originCenter = {
      x: originSticky.location.x - boardOrigin.x + (stickySize * originSizeX) / 2,
      y: originSticky.location.y - boardOrigin.y + (stickySize * originSizeY) / 2,
    };
    
    if (destSticky) {
      // Both endpoints connected to stickies
      // Validate destination sticky location coordinates
      if (!destSticky.location || typeof destSticky.location.x !== 'number' || typeof destSticky.location.y !== 'number' ||
          isNaN(destSticky.location.x) || isNaN(destSticky.location.y)) {
        console.warn('Invalid destination sticky location:', destSticky.location);
        return; // Skip rendering if sticky location is invalid
      }
      
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
        stickySize * originSizeX,
        stickySize * originSizeY
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        originCenter.x,
        originCenter.y,
        stickySize * destSizeX,
        stickySize * destSizeY
      );
    } else if (destImage) {
      // Destination connected to image
      // Validate destination image location coordinates
      if (!destImage.location || typeof destImage.location.x !== 'number' || typeof destImage.location.y !== 'number' ||
          isNaN(destImage.location.x) || isNaN(destImage.location.y)) {
        console.warn('Invalid destination image location:', destImage.location);
        return; // Skip rendering if image location is invalid
      }
      
      const destCenter = {
        x: destImage.location.x - boardOrigin.x + destImage.width / 2,
        y: destImage.location.y - boardOrigin.y + destImage.height / 2,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        stickySize * originSizeX,
        stickySize * originSizeY
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        originCenter.x,
        originCenter.y,
        destImage.width,
        destImage.height
      );
    } else {
      // Origin connected, destination unconnected
      const destPoint = connector.destinationPoint || { x: 0, y: 0 };
      
      // Validate destination point coordinates
      if (typeof destPoint.x !== 'number' || typeof destPoint.y !== 'number' || 
          isNaN(destPoint.x) || isNaN(destPoint.y)) {
        console.warn('Invalid destination point:', destPoint);
        return; // Skip rendering if destination point is invalid
      }
      
      const destCenter = {
        x: destPoint.x - boardOrigin.x,
        y: destPoint.y - boardOrigin.y,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        stickySize * originSizeX,
        stickySize * originSizeY
      );
      
      endPoint = destCenter;
    }
  } else if (originImage) {
    // Connected to image
    // Validate image location coordinates
    if (!originImage.location || typeof originImage.location.x !== 'number' || typeof originImage.location.y !== 'number' ||
        isNaN(originImage.location.x) || isNaN(originImage.location.y)) {
      console.warn('Invalid origin image location:', originImage.location);
      return; // Skip rendering if image location is invalid
    }
    
    const originCenter = {
      x: originImage.location.x - boardOrigin.x + originImage.width / 2,
      y: originImage.location.y - boardOrigin.y + originImage.height / 2,
    };
    
    if (destSticky) {
      // Origin image, destination sticky
      // Validate destination sticky location coordinates
      if (!destSticky.location || typeof destSticky.location.x !== 'number' || typeof destSticky.location.y !== 'number' ||
          isNaN(destSticky.location.x) || isNaN(destSticky.location.y)) {
        console.warn('Invalid destination sticky location:', destSticky.location);
        return; // Skip rendering if sticky location is invalid
      }
      
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
        originImage.width,
        originImage.height
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        originCenter.x,
        originCenter.y,
        stickySize * destSizeX,
        stickySize * destSizeY
      );
    } else if (destImage) {
      // Both endpoints connected to images
      // Validate destination image location coordinates
      if (!destImage.location || typeof destImage.location.x !== 'number' || typeof destImage.location.y !== 'number' ||
          isNaN(destImage.location.x) || isNaN(destImage.location.y)) {
        console.warn('Invalid destination image location:', destImage.location);
        return; // Skip rendering if image location is invalid
      }
      
      const destCenter = {
        x: destImage.location.x - boardOrigin.x + destImage.width / 2,
        y: destImage.location.y - boardOrigin.y + destImage.height / 2,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        originImage.width,
        originImage.height
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        originCenter.x,
        originCenter.y,
        destImage.width,
        destImage.height
      );
    } else {
      // Origin image connected, destination unconnected
      const destPoint = connector.destinationPoint || { x: 0, y: 0 };
      
      // Validate destination point coordinates
      if (typeof destPoint.x !== 'number' || typeof destPoint.y !== 'number' || 
          isNaN(destPoint.x) || isNaN(destPoint.y)) {
        console.warn('Invalid destination point:', destPoint);
        return; // Skip rendering if destination point is invalid
      }
      
      const destCenter = {
        x: destPoint.x - boardOrigin.x,
        y: destPoint.y - boardOrigin.y,
      };
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        destCenter.x,
        destCenter.y,
        originImage.width,
        originImage.height
      );
      
      endPoint = destCenter;
    }
  } else {
    // Origin unconnected
    const originPoint = connector.originPoint || { x: 0, y: 0 };
    
    // Validate origin point coordinates
    if (typeof originPoint.x !== 'number' || typeof originPoint.y !== 'number' || 
        isNaN(originPoint.x) || isNaN(originPoint.y)) {
      console.warn('Invalid origin point:', originPoint);
      return; // Skip rendering if origin point is invalid
    }
    
    startPoint = {
      x: originPoint.x - boardOrigin.x,
      y: originPoint.y - boardOrigin.y,
    };
    
    if (destSticky) {
      // Origin unconnected, destination connected to sticky
      // Validate destination sticky location coordinates
      if (!destSticky.location || typeof destSticky.location.x !== 'number' || typeof destSticky.location.y !== 'number' ||
          isNaN(destSticky.location.x) || isNaN(destSticky.location.y)) {
        console.warn('Invalid destination sticky location:', destSticky.location);
        return; // Skip rendering if sticky location is invalid
      }
      
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
        stickySize * destSizeX,
        stickySize * destSizeY
      );
    } else if (destImage) {
      // Origin unconnected, destination connected to image
      // Validate destination image location coordinates
      if (!destImage.location || typeof destImage.location.x !== 'number' || typeof destImage.location.y !== 'number' ||
          isNaN(destImage.location.x) || isNaN(destImage.location.y)) {
        console.warn('Invalid destination image location:', destImage.location);
        return; // Skip rendering if image location is invalid
      }
      
      const destCenter = {
        x: destImage.location.x - boardOrigin.x + destImage.width / 2,
        y: destImage.location.y - boardOrigin.y + destImage.height / 2,
      };
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        startPoint.x,
        startPoint.y,
        destImage.width,
        destImage.height
      );
    } else {
      // Both endpoints unconnected
      const destPoint = connector.destinationPoint || { x: 0, y: 0 };
      
      // Validate destination point coordinates
      if (typeof destPoint.x !== 'number' || typeof destPoint.y !== 'number' || 
          isNaN(destPoint.x) || isNaN(destPoint.y)) {
        console.warn('Invalid destination point:', destPoint);
        return; // Skip rendering if destination point is invalid
      }
      
      endPoint = {
        x: destPoint.x - boardOrigin.x,
        y: destPoint.y - boardOrigin.y,
      };
    }
  }
  
  // Validate that we have valid start and end points
  if (!startPoint || !endPoint || 
      typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number' ||
      typeof endPoint.x !== 'number' || typeof endPoint.y !== 'number' ||
      isNaN(startPoint.x) || isNaN(startPoint.y) ||
      isNaN(endPoint.x) || isNaN(endPoint.y)) {
    console.warn('Invalid start or end point:', { startPoint, endPoint });
    return; // Skip rendering if points are invalid
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
  
  // Only apply marker-end if arrow head is not "none"
  if (arrowHeadType !== "none") {
    container.path.setAttribute("marker-end", `url(#${markerId})`);
  } else {
    container.path.removeAttribute("marker-end");
  }
  
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
  if (!connector.originId && !connector.originImageId) {
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
  if (!connector.destinationId && !connector.destinationImageId) {
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
    case "none": {
      // No arrow head - marker remains empty
      break;
    }
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