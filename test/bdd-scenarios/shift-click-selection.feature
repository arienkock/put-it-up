Feature: Shift-Click Selection Management
  As a user
  I want to manage selection using shift-click
  So that I can select multiple items efficiently

  Background:
    Given the board has starter content with stickies
    And sticky-1 is visible on the board
    And sticky-2 is visible on the board

  Scenario: Select multiple items with shift-click
    Given I have clicked on sticky-1 to select it
    When I hold the shift key
    And I click on sticky-2
    Then both sticky-1 and sticky-2 should be selected
    And the selection should persist after the shift key is released

  Note:
    This scenario is currently skipped due to Playwright shift-click detection issues.
    The implementation uses event.shiftKey, but Playwright's keyboard.down/up
    may not be detected by the click event handler.
