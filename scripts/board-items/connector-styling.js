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
      // Determine targeting point for curved connectors (Option A: ray towards control point)
      // Prefer explicit curve control point if present; otherwise none here (self-connection handled later)
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      const targetForEnd = controlTarget || originCenter;

      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        stickySize * originSizeX,
        stickySize * originSizeY
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
      
      // Prefer explicit curve control point when present
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      const targetForEnd = controlTarget || originCenter;

      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        stickySize * originSizeX,
        stickySize * originSizeY
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      const targetForEnd = controlTarget || originCenter;

      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        originImage.width,
        originImage.height
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      const targetForEnd = controlTarget || originCenter;

      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
        originImage.width,
        originImage.height
      );
      
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForStart = controlTarget || destCenter;
      
      startPoint = calculateEdgePoint(
        originCenter.x,
        originCenter.y,
        targetForStart.x,
        targetForStart.y,
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
      
      // When curved, aim the ray from the destination center towards control target if present
      const controlTarget = connector.curveControlPoint || null;
      const targetForEnd = controlTarget || startPoint;
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
      
      const controlTarget = connector.curveControlPoint || null;
      const targetForEnd = controlTarget || startPoint;
      endPoint = calculateEdgePoint(
        destCenter.x,
        destCenter.y,
        targetForEnd.x,
        targetForEnd.y,
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
  
  // Resolve control point for self-connections (same start and end object)
  const isSelfConnection = (
    connector.originId && connector.destinationId && connector.originId === connector.destinationId
  ) || (
    connector.originImageId && connector.destinationImageId && connector.originImageId === connector.destinationImageId
  );

  // Compute an effective control point used for rendering and handle placement
  let effectiveControlPoint = null;
  if (connector.curveControlPoint) {
    effectiveControlPoint = connector.curveControlPoint;
  } else if (isSelfConnection) {
    // Derive the connected object's center and size in board coordinates
    let centerX = null;
    let centerY = null;
    let objWidth = null;
    let objHeight = null;
    if (originSticky && destSticky && connector.originId === connector.destinationId) {
      const sizeX = (originSticky.size && originSticky.size.x) || 1;
      const sizeY = (originSticky.size && originSticky.size.y) || 1;
      objWidth = stickySize * sizeX;
      objHeight = stickySize * sizeY;
      centerX = originSticky.location.x - boardOrigin.x + objWidth / 2;
      centerY = originSticky.location.y - boardOrigin.y + objHeight / 2;
    } else if (originImage && destImage && connector.originImageId === connector.destinationImageId) {
      objWidth = originImage.width;
      objHeight = originImage.height;
      centerX = originImage.location.x - boardOrigin.x + objWidth / 2;
      centerY = originImage.location.y - boardOrigin.y + objHeight / 2;
    }

    if (centerX !== null && centerY !== null && objWidth !== null && objHeight !== null) {
      // Place the control point outside the object (above the center) so the loop is visible
      const offset = Math.max(objWidth, objHeight) / 2 + 40;
      effectiveControlPoint = { x: centerX, y: centerY - offset };
    }
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
  
  // Draw the path - check for curve control point
  let pathData;
  let arrowOrientation = "auto";
  
  if (effectiveControlPoint) {
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
  } else {
    // No control point, use straight line
    pathData = `M ${localStartX} ${localStartY} L ${localEndX} ${localEndY}`;
  }
  
  container.path.setAttribute("d", pathData);
  
  // Only apply marker-end if arrow head is not "none"
  if (arrowHeadType !== "none") {
    container.path.setAttribute("marker-end", `url(#${markerId})`);
    // Ensure marker uses auto orientation for correct tangent alignment
    const marker = container.defs.querySelector(`#${markerId}`);
    if (marker) {
      marker.setAttribute("orient", "auto");
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
  if (!connector.originId && !connector.originImageId) {
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
  if (!connector.destinationId && !connector.destinationImageId) {
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