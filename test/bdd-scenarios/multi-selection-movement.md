# Multi-Selection and Group Movement

## Scenario: User selects multiple stickies with shift-click and moves them together

### Given
- The user is on a board with multiple stickies
- At least three stickies are present on the board

### When
- The user presses and holds the Shift key
- The user clicks on sticky-2 to select it
- The user clicks on sticky-3 (still holding Shift) to add it to the selection
- The user releases the Shift key
- The user presses the ArrowDown key to move the selection
- The user presses the ArrowRight key to move the selection

### Then
- Sticky-1 should NOT be selected
- Sticky-2 should be selected
- Sticky-3 should be selected
- Both selected stickies should move together in the same direction
- The final positions of both stickies should be shifted by the arrow key movements
- Sticky-2 should end at position close to (301, 226)
- Sticky-3 should end at position close to (401, 226)

### Notes
- This test verifies the multi-selection and group movement functionality
- Selection state is managed using Shift key modifier
- Arrow keys should move all selected items together
- Movement should be consistent and coordinated across all selected items
- The test verifies that deselected items (sticky-1) remain in place

