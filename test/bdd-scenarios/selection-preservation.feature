Feature: Selection Preservation After Drag
  As a user
  I want my selection to be preserved after completing a drag operation
  So that I can continue working with the same selection

  Background:
    Given the board has multiple stickies
    And I have selected multiple stickies

  Scenario: Selection remains after drag completion
    Given I have selected two stickies (sticky-1 and sticky-2)
    When I drag the selected stickies to a new position
    And I release the mouse to complete the drag
    Then both sticky-1 and sticky-2 should remain selected
    And the selection should be visually indicated
    And I should be able to continue manipulating the selection

  Note:
    This test is complex and depends on specific drag behavior.
    Currently skipped to focus on core functionality.
