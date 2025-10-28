Feature: Custom Drag Behavior
  As a user
  I want to drag stickies using custom drag detection
  So that I can move items smoothly across the board

  Background:
    Given the board has starter content with stickies
    And sticky-1 is visible on the board

  Scenario: Move sticky with custom drag
    Given I have located sticky-1 on the board
    When I click near the top of sticky-1 (outside text area)
    And I move the mouse significantly past the drag threshold (>5px)
    And I continue dragging to a new position
    And I release the mouse
    Then the sticky should be positioned at the new location
    And the position change should respect grid snapping with 20px tolerance
    And the sticky should be at least 100px to the right
    And the sticky should be at least 50px below

