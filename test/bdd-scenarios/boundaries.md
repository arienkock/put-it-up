# Boundary Enforcement and Tab Ordering Scenarios

## Scenario: Prevent stickies from moving beyond top-left boundary
**Given** the user has a sticky on the board
**When** the user selects the sticky
**And** presses ArrowLeft 10 times
**And** presses ArrowUp 10 times
**Then** the sticky should be at position (1, 1)
**And** the sticky should not move beyond the board's origin

## Scenario: Prevent stickies from moving beyond bottom-right boundary
**Given** the user has a sticky at position (1, 1)
**When** the user presses ArrowDown 60 times
**And** presses ArrowRight 95 times
**Then** the sticky should be at approximately position (2301, 1251)
**And** the sticky should not move beyond the board's limits

## Scenario: Tab order based on sticky positioning
**Given** the user has an empty board
**When** the user creates 9 stickies in a 3x3 grid (left to right, top to bottom)
**And** creates 9 more stickies in a 3x3 grid in reverse order
**Then** the stickies in the DOM should be ordered based on their y-coordinate first, then x-coordinate
**And** the selected sticky should have z-index of 1
**And** stickies should appear in the DOM in reading order (left-to-right, top-to-bottom)

