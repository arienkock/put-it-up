# Sticky Deletion Scenarios

## Scenario: Delete selected stickies with menu button
**Given** the user has a board with 4 stickies
**When** the user clicks on sticky 1
**And** holds Shift and clicks on sticky 2
**And** clicks the delete button in the board action menu
**Then** stickies 1 and 2 should be removed from the board
**And** the remaining stickies (3 and 4) should still be visible

## Scenario: Delete selected stickies with Delete key
**Given** the user has a board with 4 stickies
**When** the user clicks on sticky 1
**And** holds Shift and clicks on sticky 2
**And** presses the Delete key
**Then** stickies 1 and 2 should be removed from the board
**And** the remaining stickies (3 and 4) should still be visible

