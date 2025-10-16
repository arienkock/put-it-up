import { createConnectorDOM, removePx } from "./connector-dom.js";
import { setConnectorStyles } from "./connector-styling.js";

export const CONNECTOR_TYPE = "application/connector";
export const DEFAULT_ARROW_HEAD = "filled";

export const createRenderer = (
  board,
  domElement,
  getSelectedConnectors
) =>
  function renderConnector(connectorId, connector) {
    const selectedConnectors = getSelectedConnectors();
    const shouldDelete = connector === undefined;
    const connectorElement = getConnectorElement(
      domElement,
      connectorId,
      board,
      selectedConnectors,
      shouldDelete
    );
    
    if (connectorElement) {
      const originSticky = connector.originId ? board.getStickySafe(connector.originId) : null;
      const destSticky = connector.destinationId ? board.getStickySafe(connector.destinationId) : null;
      
      // Skip rendering if both endpoints are unconnected and have no points
      if (!originSticky && !destSticky && !connector.originPoint && !connector.destinationPoint) {
        return;
      }
      
      const connectorIsSelected = !!selectedConnectors.isSelected(connectorId);
      setConnectorStyles(
        connector,
        connectorElement,
        originSticky,
        destSticky,
        connectorIsSelected,
        board.getOrigin(),
        board.getStickyBaseSize()
      );
    }
  };

function getConnectorElement(
  boardElement,
  id,
  board,
  selectedConnectors,
  shouldDelete = false
) {
  const connectorIdClass = "connector-" + id;
  let container = boardElement[connectorIdClass];
  
  if (shouldDelete) {
    delete boardElement[connectorIdClass];
    if (container) {
      boardElement.removeChild(container);
    }
    container = undefined;
    // Reorder elements after deletion
    reorderBoardElements(boardElement);
  } else if (!container) {
    container = createConnectorDOM(connectorIdClass, id, selectedConnectors);
    boardElement[connectorIdClass] = container;
    boardElement.appendChild(container);
    // Reorder elements after addition
    reorderBoardElements(boardElement);
  }
  
  return container;
}

/**
 * Reorders board elements to ensure connectors are behind stickies
 * Only called when elements are added or removed to avoid unnecessary DOM manipulation
 */
function reorderBoardElements(domElement) {
  const elementsOnBoard = [...domElement.children];
  const activeElement = document.activeElement;
  let shouldRefocus = false;
  if (elementsOnBoard.some((el) => el.contains(activeElement))) {
    shouldRefocus = true;
  }
  elementsOnBoard.sort((a, b) => {
    // Connectors first, then stickies (by position)
    const aIsConnector = a.classList.contains("connector-container");
    const bIsConnector = b.classList.contains("connector-container");
    
    if (aIsConnector && !bIsConnector) return -1;
    if (!aIsConnector && bIsConnector) return 1;
    
    // Both connectors or both stickies - sort by position
    let yDif = removePx(a.style.top) - removePx(b.style.top);
    if (yDif === 0) {
      const xDif = removePx(a.style.left) - removePx(b.style.left);
      if (xDif === 0) {
        return b.className > a.className;
      }
      return xDif;
    }
    return yDif;
  });
  elementsOnBoard.forEach((el) => domElement.appendChild(el));
  if (shouldRefocus) {
    activeElement.focus();
  }
}
