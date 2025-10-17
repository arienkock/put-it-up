# Sticky Text Editing Scenarios

## Scenario: Update sticky text by typing
**Given** the user has a board with a sticky containing the text "One"
**When** the user clicks on the sticky's text input
**And** moves the cursor to the end
**And** deletes the last 3 characters
**And** types "Testing"
**Then** the sticky text should be "Testing"
**And** the board's internal state should reflect this text

## Scenario: Complete text editing with Escape key
**Given** the user has a board with a sticky containing the text "One"
**When** the user clicks on the sticky's text input
**And** moves to the end and types "x"
**And** presses Enter (which inserts nothing due to newline removal)
**And** types "y"
**And** clicks on the text input again
**And** moves to the end and types "z"
**And** presses Escape
**And** types "0" (should not be entered as editing mode is exited)
**Then** the sticky text should be "Onexz"

## Scenario: Text area resizes as user types
**Given** the user has a board with a sticky containing the text "One"
**When** the user clicks on the sticky's text input
**And** deletes the original text
**And** types "Testing"
**Then** the text area should have 1 row
**When** the user types " sizing"
**Then** the text area should have 2 rows
**When** the user types a long string of additional words
**Then** the text area should have 6 or 7 rows (depending on browser rendering)

