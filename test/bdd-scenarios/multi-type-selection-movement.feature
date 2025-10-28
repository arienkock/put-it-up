Feature: Multi-Type Selection and Movement
  As a user
  I want to select and move multiple types of items simultaneously
  So that I can manipulate mixed content types together

  Background:
    Given the board has been initialized with mixed content types
    And the board contains both stickies and images

  Scenario: Select and move mixed content with arrow keys
    Given I have selected a sticky
    And I have selected an image using shift-click
    When I press the ArrowDown key twice
    And I press the ArrowRight key twice
    And I press the ArrowUp key once
    And I press the ArrowLeft key once
    Then both the sticky and image should have moved down by 10px
    And both the sticky and image should have moved right by 10px

  Note:
    This scenario requires additional setup for mixed content types.
    Currently skipped as it requires more complex board initialization.
