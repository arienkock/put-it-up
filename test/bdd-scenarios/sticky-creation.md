# Sticky Creation Scenarios

## Scenario: Create sticky with keyboard shortcut
**Given** the user has an empty board loaded
**When** the user presses the 'n' key
**Then** the board cursor should change to crosshair
**When** the user clicks on the board
**Then** a new sticky should be created near the click location (within one grid unit)

## Scenario: Cancel sticky creation with Escape
**Given** the user has pressed 'n' to enter sticky creation mode
**And** the board cursor is crosshair
**When** the user presses the Escape key
**Then** the board cursor should return to auto
**When** the user clicks on the board
**Then** no new sticky should be created

## Scenario: Create sticky from menu button
**Given** the user has an empty board loaded
**When** the user clicks the "new sticky" button in the board action menu
**Then** the board cursor should change to crosshair
**When** the user clicks on the board
**Then** a new sticky should be created near the click location (within one grid unit)

## Scenario: Create sticky when zoomed
**Given** the user has an empty board loaded
**And** the user has zoomed out by pressing 'o'
**And** the board is scrolled into view
**When** the user presses 'n'
**And** clicks on the board
**Then** a new sticky should be created near the click location (within one grid unit)
**And** the sticky position should be correctly calculated relative to the zoom level

