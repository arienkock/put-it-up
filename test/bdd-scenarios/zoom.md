# Zoom Functionality Scenarios

## Scenario: Zoom in with 'o' key
**Given** the user has a board with stickies
**And** the board has a certain width and height
**When** the user presses 'o' twice
**Then** the board width should be greater than before
**And** the board height should be greater than before
**And** the sticky width should be greater than before
**And** the sticky height should be greater than before

## Scenario: Zoom out with Shift+O
**Given** the user has a board with stickies
**And** the board has a certain width and height
**When** the user holds Shift and presses 'O' twice
**Then** the board width should be less than before
**And** the board height should be less than before
**And** the sticky width should be less than before
**And** the sticky height should be less than before

## Scenario: Zoom in with menu button
**Given** the user has a board with stickies
**And** the board has a certain width and height
**When** the user clicks the "change zoom" button twice
**Then** the board width should be greater than before
**And** the board height should be greater than before
**And** the sticky dimensions should be greater than before

## Scenario: Zoom out with Shift + menu button click
**Given** the user has a board with stickies
**And** the board has a certain width and height
**When** the user holds Shift and clicks the "change zoom" button twice
**Then** the board width should be less than before
**And** the board height should be less than before
**And** the sticky dimensions should be less than before

