/**
 * Hit testing utilities for connector click pass-through
 */

/**
 * Checks if a click event actually hit a connector's path stroke
 * @param {MouseEvent} event - The click event
 * @param {SVGPathElement} pathElement - The connector's path element
 * @returns {boolean} True if the click hit the stroke
 */
export function isClickOnConnectorStroke(event, pathElement) {
  if (!pathElement || !pathElement.getTotalLength) {
    return false;
  }
  
  try {
    // Get the SVG element that contains the path
    const svgElement = pathElement.ownerSVGElement;
    if (!svgElement) {
      return false;
    }
    
    // Get the transformation matrix from the path's coordinate system to screen coordinates
    const ctm = pathElement.getScreenCTM();
    
    if (!ctm) {
      return false;
    }
    
    // Create a point in SVG coordinate space and convert from screen coordinates
    // to the path element's local coordinate system
    const svgPoint = svgElement.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    
    // Transform from screen coordinates to path's local coordinate system
    const pathCoord = svgPoint.matrixTransform(ctm.inverse());
    
    // Use isPointInStroke to check if the point is on the path stroke
    // isPointInStroke works in the path element's local coordinate system
    return pathElement.isPointInStroke(pathCoord);
  } catch (error) {
    console.warn('[ConnectorHitTesting] Error checking stroke hit:', error);
    return false;
  }
}
