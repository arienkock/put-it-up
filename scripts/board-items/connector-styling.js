import { calculateEdgePoint } from "./connector-dom.js";
import { getBoardItemBounds } from "./board-item-interface.js";

export const ARROW_HEAD_TYPES = ["none", "line", "hollow", "filled"];

/**
 * Sets the styles and position of a connector
 * 
 * @param {Object} connector - Connector data object
 * @param {HTMLElement} container - Container element
 * @param {Object|null} originItem - Origin item data (sticky or image) - null if unconnected
 * @param {Object|null} destItem - Destination item data (sticky or image) - null if unconnected
 * @param {boolean} isSelected - Whether connector is selected
 * @param {Object} boardOrigin - Board origin {x, y}
 * @param {string} connectorId - Connector ID
 */
export function setConnectorStyles(
  connector,
  container,
  originItem,
  destItem,
  isSelected,
  boardOrigin,
  connectorId
) {
  const arrowHeadType = connector.arrowHead || "filled";
  
  // Validate inputs to prevent NaN errors
  if (!boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' || 
      isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
    console.warn('Invalid boardOrigin:', boardOrigin);
    return; // Skip rendering if board origin is invalid
  }
  
  // Calculate start and end points using generic bounds
  let startPoint, endPoint;
  
  const originBounds = getBoardItemBounds(originItem, boardOrigin);
  const destBounds = getBoardItemBounds(destItem, boardOrigin);
  
  if (originBounds) {
    // Origin is connected to an item (sticky or image)
    const originCenter = { x: originBounds.centerX, y: originBounds.centerY };
    
    if (destBounds) {
      // Both endpoints connected to items
      const destCenter = { x: destBounds.centerX, y: destBounds.centerY };
      
      // Determine targeting point for curved connectors
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      const targetForEnd = controlTarget || originCenter;
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        originBounds.width,
        originBounds.height
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
        destBounds.width,
        destBounds.height
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        originBounds.width,
        originBounds.height
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
    
    if (destBounds) {
      // Origin unconnected, destination connected to item
      const destCenter = { x: destBounds.centerX, y: destBounds.centerY };
      
      // When curved, aim the ray from the destination center towards control target if present
      const controlTarget = connector.curveControlPoint || null;
      const targetForEnd = controlTarget || startPoint;
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
        destBounds.width,
        destBounds.height
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
  
  // Resolve control point or self-loop parameters
  // Check if origin and destination are the same item (self-connection)
  // Only treat as self-connection if IDs and types actually exist AND match
  const isSelfConnection = (connector.originItemId && connector.originItemType && 
                            connector.destinationItemId && connector.destinationItemType &&
                            connector.originItemId === connector.destinationItemId &&
                            connector.originItemType === connector.destinationItemType);

  // Compute an effective control point used for traditional 2-segment curves and handle placement
  let effectiveControlPoint = null;
  if (connector.curveControlPoint) {
    effectiveControlPoint = connector.curveControlPoint;
  }

  // Calculate bounding box for the SVG
  let minX = Math.min(startPoint.x, endPoint.x);
  let minY = Math.min(startPoint.y, endPoint.y);
  let maxX = Math.max(startPoint.x, endPoint.x);
  let maxY = Math.max(startPoint.y, endPoint.y);
  
  // Include curve control point in bounding box if it exists
  if (effectiveControlPoint) {
    minX = Math.min(minX, effectiveControlPoint.x);
    minY = Math.min(minY, effectiveControlPoint.y);
    maxX = Math.max(maxX, effectiveControlPoint.x);
    maxY = Math.max(maxY, effectiveControlPoint.y);
  }
  
  // Add padding for arrow head and handles
  const strokeWidth = 4;
  const markerExtension = 6 * strokeWidth;
  const handleSize = 8; // Size of unconnected endpoint handles
  // Compute additional padding if the curve bulges far from the chord
  let dynamicCurvePadding = 0;
  if (effectiveControlPoint) {
    const chordMidX = (startPoint.x + endPoint.x) / 2;
    const chordMidY = (startPoint.y + endPoint.y) / 2;
    // Distance of control point from the midpoint of the chord as a proxy for bulge
    const dx = effectiveControlPoint.x - chordMidX;
    const dy = effectiveControlPoint.y - chordMidY;
    const bulge = Math.hypot(dx, dy);
    // Scale factor chosen empirically to cover cubic handles and marker size
    dynamicCurvePadding = Math.min(Math.max(bulge * 0.35, 0), 200);
  }
  const padding = Math.max(50, markerExtension + handleSize + 10, dynamicCurvePadding);
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
  // Ensure any stroke joins/markers extending beyond viewBox are still visible
  svg.style.overflow = "visible";
  
  // Calculate local coordinates for the path
  const localStartX = startPoint.x - minX + padding;
  const localStartY = startPoint.y - minY + padding;
  const localEndX = endPoint.x - minX + padding;
  const localEndY = endPoint.y - minY + padding;
  
  // Calculate midpoint for comparison
  const midpointX = (localStartX + localEndX) / 2;
  const midpointY = (localStartY + localEndY) / 2;
  
  // Update arrow head marker
  const connectorColor = connector.color || "#000000";
  const markerId = updateArrowHeadMarker(container.defs, arrowHeadType, isSelected, connectorColor, connectorId);
  
  // Draw the path - check for curve control point and self-loop
  let pathData;
  let arrowOrientation = "auto";
  let usedSelfLoopPath = false;
  let selfLoopCenterBoard = null; // {x,y} for arrowhead orientation

  // Helper to build a very simple self-loop (two smooth cubic segments via one apex)
  function buildSelfLoopPath() {
    // Use generic bounds to determine object center and size
    const bounds = getBoardItemBounds(originItem || destItem, boardOrigin);
    if (!bounds) {
      return null;
    }
    
    const objCenterX = bounds.centerX;
    const objCenterY = bounds.centerY;
    const objWidth = bounds.width;
    const objHeight = bounds.height;

    // Loop sizing: radius = 0.5 * average(width, height), clamped
    const avg = (objWidth + objHeight) / 2;
    const rawRadius = 0.5 * avg;
    const radius = Math.max(40, Math.min(300, rawRadius));
    const margin = Math.max(12, Math.min(48, avg * 0.15));

    // Bottom-right direction
    const norm = Math.SQRT1_2; // 1 / sqrt(2)
    const dirX = norm;
    const dirY = norm;
    const loopCenterBoardX = objCenterX + dirX * (radius + margin);
    const loopCenterBoardY = objCenterY + dirY * (radius + margin);

    // Always derive anchors from object edges to ensure consistent self-loop
    const startEdge = calculateEdgePoint(objCenterX, objCenterY, objCenterX + objWidth, objCenterY + objHeight * 0.25, objWidth, objHeight);
    const endEdge = calculateEdgePoint(objCenterX, objCenterY, objCenterX + objWidth * 0.25, objCenterY + objHeight, objWidth, objHeight);
    const sBX = startEdge.x; const sBY = startEdge.y;
    const eBX = endEdge.x; const eBY = endEdge.y;

    // Convert to local space
    const sX = sBX - minX + padding;
    const sY = sBY - minY + padding;
    const eX = eBX - minX + padding;
    const eY = eBY - minY + padding;
    const cX = loopCenterBoardX - minX + padding;
    const cY = loopCenterBoardY - minY + padding;

    // Build a single SVG arc for a simple, smooth loop
    // Use large-arc to ensure a visible loop; sweep clockwise
    const rx = radius;
    const ry = radius;
    const xAxisRotation = 0;
    const largeArcFlag = 1;
    const sweepFlag = 1;
    const dStr = `M ${sX} ${sY} A ${rx} ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${eX} ${eY}`;
    return dStr;
  }

  if (isSelfConnection && !connector.curveControlPoint) {
    const loopPath = buildSelfLoopPath();
    if (loopPath) {
      pathData = loopPath;
      usedSelfLoopPath = true;
      // Derive center for arrow orientation using generic bounds
      const bounds = getBoardItemBounds(originItem || destItem, boardOrigin);
      if (bounds) {
        selfLoopCenterBoard = {
          x: bounds.centerX,
          y: bounds.centerY
        };
      }
    }
  }

  if (!pathData && effectiveControlPoint) {
    // Convert control point to local coordinates
    const controlX = effectiveControlPoint.x - minX + padding;
    const controlY = effectiveControlPoint.y - minY + padding;
    
    // Check if control point is different from midpoint (to avoid unnecessary segments)
    const controlDistanceFromMidpoint = Math.sqrt(
      Math.pow(controlX - midpointX, 2) + Math.pow(controlY - midpointY, 2)
    );
    
    if (controlDistanceFromMidpoint > 1) { // 1 pixel threshold
      // Create two cubic Bezier segments that meet at the control point (smoothly)
      // Compute unit direction vectors for straight segments
      const vSCx = controlX - localStartX;
      const vSCy = controlY - localStartY;
      const lenSC = Math.hypot(vSCx, vSCy) || 1;
      const dirSCx = vSCx / lenSC;
      const dirSCy = vSCy / lenSC;
      
      const vCEdx = localEndX - controlX;
      const vCEdy = localEndY - controlY;
      const lenCE = Math.hypot(vCEdx, vCEdy) || 1;
      const dirCEx = vCEdx / lenCE;
      const dirCEy = vCEdy / lenCE;
      
      // Tangent at the midpoint: use angle bisector for smooth join
      let tanCx = dirSCx + dirCEx;
      let tanCy = dirSCy + dirCEy;
      const tanLen = Math.hypot(tanCx, tanCy);
      if (tanLen < 1e-6) {
        // Opposite directions (straight line). Fallback to one of the segment directions
        tanCx = dirSCx;
        tanCy = dirSCy;
      } else {
        tanCx /= tanLen;
        tanCy /= tanLen;
      }
      
      // Use unified handle scales: keep ends straight (0) and control curvature around midpoint
      const endHandleScale = 0.0; // c1/c4: ends are straight into/out of the curve
      const midScale = 0.22;      // c2/c3: curvature around the midpoint
      
      // First cubic from start -> control point
      const c1x = localStartX + dirSCx * (lenSC * endHandleScale);
      const c1y = localStartY + dirSCy * (lenSC * endHandleScale);
      const c2x = controlX - tanCx * (lenSC * midScale);
      const c2y = controlY - tanCy * (lenSC * midScale);
      
      // Second cubic from control point -> end
      const c3x = controlX + tanCx * (lenCE * midScale);
      const c3y = controlY + tanCy * (lenCE * midScale);
      const c4x = localEndX - dirCEx * (lenCE * endHandleScale);
      const c4y = localEndY - dirCEy * (lenCE * endHandleScale);
      
      pathData = `M ${localStartX} ${localStartY} C ${c1x} ${c1y} ${c2x} ${c2y} ${controlX} ${controlY} C ${c3x} ${c3y} ${c4x} ${c4y} ${localEndX} ${localEndY}`;
      
      // Let marker orient automatically follow the path tangent at the end
      arrowOrientation = "auto";
    } else {
      // Control point is at midpoint, use straight line
      pathData = `M ${localStartX} ${localStartY} L ${localEndX} ${localEndY}`;
    }
  } else if (!pathData) {
    // No control point, use straight line
    pathData = `M ${localStartX} ${localStartY} L ${localEndX} ${localEndY}`;
  }
  
  container.path.setAttribute("d", pathData);
  
  // Only apply marker-end if arrow head is not "none"
  if (arrowHeadType !== "none") {
    container.path.setAttribute("marker-end", `url(#${markerId})`);
    const marker = container.defs.querySelector(`#${markerId}`);
    if (marker) {
      if (usedSelfLoopPath) {
        // For self-loops, force arrowhead to point up (toward the item bottom edge normal)
        // SVG angles: 0 = right, 90 = down, -90/270 = up
        const angleDeg = -90;
        marker.setAttribute("orient", String(angleDeg));
      } else {
        // Default automatic orientation along the path
        marker.setAttribute("orient", "auto");
      }
    }
  } else {
    container.path.removeAttribute("marker-end");
  }
  
  container.path.style.pointerEvents = "all"; // Allow clicks on the path
  
  // Add handles for unconnected endpoints
  updateConnectorHandles(container, connector, localStartX, localStartY, localEndX, localEndY, isSelected, startPoint, endPoint, effectiveControlPoint);
  
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
  
  // Apply z-index from connector data
  if (connector.zIndex !== undefined) {
    container.style.zIndex = connector.zIndex.toString();
  }
}

/**
 * Updates or creates handles for unconnected connector endpoints
 */
function updateConnectorHandles(container, connector, localStartX, localStartY, localEndX, localEndY, isSelected, startPoint, endPoint, effectiveControlPoint) {
  const svg = container.svg;
  
  // Remove existing handles
  const existingHandles = svg.querySelectorAll('.connector-handle');
  existingHandles.forEach(handle => handle.remove());
  
  const handleSize = 8;
  const color = isSelected ? "#4646d8" : "#000000";
  
  // Calculate board-space coordinates for handles
  // The startPoint and endPoint are already in board coordinates
  // We just need to use them directly
  const boardStartX = startPoint.x;
  const boardStartY = startPoint.y;
  const boardEndX = endPoint.x;
  const boardEndY = endPoint.y;
  
  // Add handle for unconnected origin
  if (!connector.originItemId || !connector.originItemType) {
    const originHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    originHandle.classList.add("connector-handle");
    originHandle.classList.add("origin-handle");
    originHandle.classList.add("connector-handle-hidden"); // Hidden by default
    originHandle.setAttribute("cx", localStartX);
    originHandle.setAttribute("cy", localStartY);
    originHandle.setAttribute("r", handleSize / 2);
    originHandle.setAttribute("fill", color);
    originHandle.setAttribute("stroke", "white");
    originHandle.setAttribute("stroke-width", "2");
    originHandle.setAttribute("cursor", "grab");
    originHandle.setAttribute("data-handle-position", `${boardStartX},${boardStartY}`);
    originHandle.style.pointerEvents = "all";
    // Ensure handles are visible immediately for selected connectors
    if (isSelected) {
      originHandle.classList.remove("connector-handle-hidden");
    }
    svg.appendChild(originHandle);
  }
  
  // Add handle for unconnected destination
  if (!connector.destinationItemId || !connector.destinationItemType) {
    const destHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    destHandle.classList.add("connector-handle");
    destHandle.classList.add("destination-handle");
    destHandle.classList.add("connector-handle-hidden"); // Hidden by default
    destHandle.setAttribute("cx", localEndX);
    destHandle.setAttribute("cy", localEndY);
    destHandle.setAttribute("r", handleSize / 2);
    destHandle.setAttribute("fill", color);
    destHandle.setAttribute("stroke", "white");
    destHandle.setAttribute("stroke-width", "2");
    destHandle.setAttribute("cursor", "grab");
    destHandle.setAttribute("data-handle-position", `${boardEndX},${boardEndY}`);
    destHandle.style.pointerEvents = "all";
    // Ensure handles are visible immediately for selected connectors
    if (isSelected) {
      destHandle.classList.remove("connector-handle-hidden");
    }
    svg.appendChild(destHandle);
  }
  
  // Add curve control handle for all connectors
  const midpointX = (localStartX + localEndX) / 2;
  const midpointY = (localStartY + localEndY) / 2;
  
  // Determine curve control handle position
  let curveHandleX, curveHandleY, curveHandleBoardX, curveHandleBoardY;
  
  // Compute board->local offsets using known start point mapping
  const offsetX = localStartX - startPoint.x;
  const offsetY = localStartY - startPoint.y;
  
  if (connector.curveControlPoint) {
    // Use existing control point
    curveHandleX = connector.curveControlPoint.x + offsetX;
    curveHandleY = connector.curveControlPoint.y + offsetY;
    curveHandleBoardX = connector.curveControlPoint.x;
    curveHandleBoardY = connector.curveControlPoint.y;
  } else if (effectiveControlPoint) {
    // Use computed effective control point (e.g., for self-connections)
    curveHandleX = effectiveControlPoint.x + offsetX;
    curveHandleY = effectiveControlPoint.y + offsetY;
    curveHandleBoardX = effectiveControlPoint.x;
    curveHandleBoardY = effectiveControlPoint.y;
  } else {
    // Use midpoint
    curveHandleX = midpointX;
    curveHandleY = midpointY;
    curveHandleBoardX = (startPoint.x + endPoint.x) / 2;
    curveHandleBoardY = (startPoint.y + endPoint.y) / 2;
  }
  
  const curveHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  curveHandle.classList.add("connector-handle");
  curveHandle.classList.add("curve-control-handle");
  curveHandle.classList.add("connector-handle-hidden"); // Hidden by default
  curveHandle.setAttribute("cx", String(curveHandleX));
  curveHandle.setAttribute("cy", String(curveHandleY));
  curveHandle.setAttribute("r", String(handleSize / 2));
  curveHandle.setAttribute("fill", "rgba(70, 70, 216, 0.6)");
  curveHandle.setAttribute("stroke", "white");
  curveHandle.setAttribute("stroke-width", "2");
  curveHandle.setAttribute("cursor", "grab");
  curveHandle.setAttribute("data-handle-position", `${curveHandleBoardX},${curveHandleBoardY}`);
  curveHandle.style.pointerEvents = "all";
  // Ensure handles are visible immediately for selected connectors
  if (isSelected) {
    curveHandle.classList.remove("connector-handle-hidden");
  }
  svg.appendChild(curveHandle);
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