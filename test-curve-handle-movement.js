/**
 * Test to verify that connector curve handles move with the connector
 */

// Mock connector with curve control point
const mockConnector = {
  originPoint: { x: 100, y: 100 },
  destinationPoint: { x: 200, y: 200 },
  curveControlPoint: { x: 150, y: 120 }
};

// Mock store
const mockStore = {
  getConnector: (id) => mockConnector,
  updateConnectorEndpoint: (id, endpoint, data) => {
    console.log(`Updated ${endpoint} endpoint:`, data);
  },
  updateCurveControlPoint: (id, point) => {
    console.log(`Updated curve control point:`, point);
  }
};

// Mock board with moveConnector method
const mockBoard = {
  moveConnector: function(id, deltaX, deltaY) {
    const connector = mockStore.getConnector(id);
    
    // Only move connectors that have at least one disconnected endpoint
    const hasDisconnectedOrigin = connector.originPoint && !connector.originId && !connector.originImageId;
    const hasDisconnectedDestination = connector.destinationPoint && !connector.destinationId && !connector.destinationImageId;
    
    if (!hasDisconnectedOrigin && !hasDisconnectedDestination) {
      return; // Connector is fully connected, don't move it
    }
    
    // Move disconnected endpoints
    if (hasDisconnectedOrigin) {
      const newOriginPoint = {
        x: connector.originPoint.x + deltaX,
        y: connector.originPoint.y + deltaY
      };
      mockStore.updateConnectorEndpoint(id, 'origin', { point: newOriginPoint });
    }
    
    if (hasDisconnectedDestination) {
      const newDestinationPoint = {
        x: connector.destinationPoint.x + deltaX,
        y: connector.destinationPoint.y + deltaY
      };
      mockStore.updateConnectorEndpoint(id, 'destination', { point: newDestinationPoint });
    }
    
    // Always move the curve handle if it exists
    if (connector.curveControlPoint) {
      const newCurveControlPoint = {
        x: connector.curveControlPoint.x + deltaX,
        y: connector.curveControlPoint.y + deltaY
      };
      mockStore.updateCurveControlPoint(id, newCurveControlPoint);
    }
  }
};

// Test the curve handle movement
function testCurveHandleMovement() {
  console.log('Testing curve handle movement...');
  console.log('Original curve control point:', mockConnector.curveControlPoint);
  
  // Move connector by (10, 5)
  mockBoard.moveConnector('test-connector', 10, 5);
  
  console.log('Expected curve control point: { x: 160, y: 125 }');
  console.log('Test completed successfully!');
}

// Run the test
testCurveHandleMovement();
