# Sticky Movement Scenarios

## Scenario: Move sticky with drag and drop
**Given** the user has a board with a sticky at position (201, 201)
**When** the user drags the sticky to a new location
**Then** the sticky should be repositioned to near the drop location (within one grid unit)
**And** the sticky should snap to the grid

## Scenario: Move sticky with arrow keys
**Given** the user has a board with a sticky
**When** the user clicks on the sticky to select it
**And** presses ArrowDown twice
**And** presses ArrowRight twice
**And** presses ArrowUp once
**And** presses ArrowLeft once
**Then** the sticky should have moved 25 pixels right and 25 pixels down from its original position
**And** the final position should be accurate within 2 pixels

## Scenario: Move multiple selected stickies together with arrow keys
**Given** the user has a board with 4 stickies
**When** the user shift-clicks to select stickies 3 and 4
**And** presses ArrowDown
**Then** both selected stickies should move down by 25 pixels
**And** unselected stickies should remain in their original positions

## Scenario: Move multiple selected stickies together with drag
**Given** the user has a board with 4 stickies
**When** the user shift-clicks to select stickies 3 and 4
**And** drags one of the selected stickies
**Then** both selected stickies should move together maintaining their relative positions
**And** unselected stickies should remain in their original positions

