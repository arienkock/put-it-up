# Selection Management Scenarios

## Scenario: Select sticky with click
**Given** the user has a board with multiple stickies
**When** the user clicks on sticky 1
**Then** sticky 1 should be selected

## Scenario: Deselect sticky by clicking on empty board area
**Given** the user has sticky 1 selected
**When** the user clicks on an empty area of the board
**Then** sticky 1 should no longer be selected

## Scenario: Add stickies to selection with Shift+click
**Given** the user has a board with 4 stickies
**When** the user holds Shift and clicks on sticky 2
**And** holds Shift and clicks on sticky 3
**And** holds Shift and clicks on sticky 4
**Then** stickies 2, 3, and 4 should be selected
**And** sticky 1 should not be selected

## Scenario: Remove sticky from selection with Shift+click
**Given** the user has stickies 2, 3, and 4 selected
**When** the user holds Shift and clicks on sticky 2
**Then** stickies 3 and 4 should remain selected
**And** sticky 2 should no longer be selected

## Scenario: Clear connector selection when selecting sticky without Shift
**Given** the user has created a connector between two stickies
**And** the connector is selected
**When** the user clicks on sticky 3 without holding Shift
**Then** sticky 3 should be selected
**And** the connector should no longer be selected

## Scenario: Clear sticky selection when selecting connector without Shift
**Given** the user has sticky 1 selected
**When** the user creates a connector between sticky 1 and sticky 2 (press 'c', click sticky 2)
**Then** the connector should be selected
**And** sticky 1 should no longer be selected

## Scenario: Select both stickies and connectors with Shift+click
**Given** the user has sticky 1 selected
**And** creates a connector to sticky 2 (which selects the connector and deselects the sticky)
**When** the user holds Shift and clicks on sticky 1
**Then** both the sticky and the connector should be selected

