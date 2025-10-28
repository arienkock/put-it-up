Feature: Escape Key Clears Selection
  As a user
  I want to clear all selections by pressing Escape
  So that I can quickly deselect items

  Background:
    Given the board has starter content with stickies
    And sticky-1 is visible on the board

  Scenario: Escape clears all selections
    Given I have clicked on sticky-1 to select it
    And I verify that sticky-1 is selected
    When I press the Escape key
    Then the selection should be cleared
    And sticky-1 should no longer be selected

  Note:
    This scenario is currently not implemented.
    In the current implementation, Escape only cancels creation modes
    (sticky/connector creation), but does not clear selections.
    To clear selections, users must click the board.
