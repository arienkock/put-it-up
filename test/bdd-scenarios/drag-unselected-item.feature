Feature: Dragging Unselected Item Resets Selection
  As a user
  I want to start dragging an unselected item
  So that the previous selection is cleared and only the dragged item is selected

  Background:
    Given the board has multiple stickies
    And sticky-1 is currently selected
    And sticky-2 is not currently selected

  Scenario: Drag unselected item resets selection
    Given sticky-1 is selected
    When I start dragging sticky-2
    Then sticky-1 should be deselected
    And sticky-2 should be selected
    And only sticky-2 should be moved

  Note:
    This test is complex and depends on specific drag behavior.
    Currently skipped to focus on core functionality.
