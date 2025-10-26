import { createConnectorDOM } from "./connector-dom.js";
import { setConnectorStyles } from "./connector-styling.js";
import { reorderBoardElements } from "./z-order-manager.js";

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
      // Ensure connector has a color
      board.ensureConnectorHasColor(connectorId);
      
      // Get generic items using unified API
      const originItem = (connector.originId || connector.originImageId) 
        ? board.getBoardItem(connector.originId || connector.originImageId) 
        : null;
      const destItem = (connector.destinationId || connector.destinationImageId)
        ? board.getBoardItem(connector.destinationId || connector.destinationImageId)
        : null;
      
      // Skip rendering if both endpoints are unconnected and have no points
      if (!originItem && !destItem && !connector.originPoint && !connector.destinationPoint) {
        return;
      }
      
      const connectorIsSelected = !!selectedConnectors.isSelected(connectorId);
      setConnectorStyles(
        connector,
        connectorElement,
        originItem,
        destItem,
        connectorIsSelected,
        board.getOrigin(),
        board.getStickyBaseSize(),
        connectorId
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
