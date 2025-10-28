Feature: Click Outside Clears Selection
  As a user
  I want clicking outside of items to clear all selections
  So that I can deselect items by clicking empty space

  Background:
    Given the board has starter content with stickies
    And sticky-1 is visible on the board

  Scenario: Click outside clears all selections
    Given I have clicked on sticky-1 to select it
    And I verify that sticky-1 is selected
    When I click on an empty area of the board (away from any stickies)
    Then the selection should be cleared
    And sticky-1 should no longer be selected
    And no other items should be selected

  Scenario: Click outside preserves selection if clicking on another item
    Given I have clicked on sticky-1 to select it
    When I click on sticky-2
    Then sticky-1 should no longer be selected
    And sticky-2 should be selected
