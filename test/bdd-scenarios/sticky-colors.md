# Sticky Color Selection Scenarios

## Scenario: Cycle to next color with 'c' key
**Given** the user has an empty board
**When** the user creates a sticky (press 'n', click board)
**And** notes the sticky's color
**And** presses 'c'
**And** creates another sticky
**Then** the second sticky should have a different color than the first

## Scenario: Cycle backwards through colors with Shift+C
**Given** the user has an empty board
**When** the user creates a sticky
**And** notes the sticky's color
**And** presses 'c' twice to advance colors
**And** holds Shift and presses 'C' twice to go back
**And** creates another sticky
**Then** the second sticky should have the same color as the first

## Scenario: Change color of unselected sticky using menu
**Given** the user has two stickies on the board
**And** sticky 1 has color A
**When** the user clicks the "change color" menu button
**And** creates a new sticky
**Then** the new sticky should have color B (different from A)

## Scenario: Change color of selected sticky using menu
**Given** the user has two stickies with different colors
**When** the user clicks on sticky 1 to select it
**And** clicks the "change color" menu button
**Then** sticky 1's color should change to match sticky 2's color

## Scenario: Change color of multiple selected stickies using menu
**Given** the user has two stickies with color A
**When** the user selects both stickies
**And** clicks the "change color" menu button
**Then** both stickies should change to a new color B
**And** both stickies should have the same color

