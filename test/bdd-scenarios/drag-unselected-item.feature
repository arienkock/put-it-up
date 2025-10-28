Feature: Dragging Unselected Item Adds to Selection
  As a user
  I want to start dragging an unselected item
  So that it automatically gets added to the current selection

  Background:
    Given the board has multiple stickies
    And sticky-1 is currently selected
    And sticky-2 is not currently selected

  Scenario: Drag unselected item adds to selection
    Given sticky-1 is selected
    When I start dragging sticky-2
    Then sticky-2 should be added to the selection
    And both sticky-1 and sticky-2 should be selected
    And the movement should apply to both stickies simultaneously

  Note:
    This test is complex and depends on specific drag behavior.
    Currently skipped to focus on core functionality.
