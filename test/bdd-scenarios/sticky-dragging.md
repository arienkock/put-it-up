# Sticky Dragging

## Scenario: User drags a sticky to move it to a new position

### Given
- The user is on a board with at least one sticky
- The sticky is at position (x1, y1)

### When
- The user presses and holds the mouse button on the sticky
- The user moves the mouse to a new position while holding the button
- The user releases the mouse button

### Then
- The sticky should be at a new position (x2, y2)
- The sticky should have moved by approximately (Δx, Δy) relative to the initial position
- The movement should respect any grid snapping constraints
- The sticky should maintain its selection state

### Notes
- This test verifies the custom drag-to-move functionality for stickies
- The test uses realistic mouse movement simulation with steps to trigger mousemove events
- Movement tolerances account for grid snapping (10px grid)
- The sticky should move smoothly during the drag operation

