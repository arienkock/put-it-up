Feature: Image Events State Machine
  As a developer
  I want to verify image event handling uses proper state machine architecture
  So that image interactions are reliable and maintainable

  Background:
    Given an image element is present on the board
    And the image events system is initialized
    And mock dependencies are set up

  Scenario: Image state machine starts in IDLE state
    Given the image events system has been initialized
    When I query the current state
    Then the state should be IDLE

  Scenario: Image transitions to DRAGGING state when drag starts
    Given the current state is IDLE
    When I simulate a mousedown event on the image
    And the app state has connector creation mode disabled
    Then the state should transition to DRAGGING
    And the mousedown event should be prevented
    And the event propagation should be stopped

  Scenario: Image state machine has proper event listeners
    Given the image events system has been initialized
    When I check the event listeners on the container
    Then mousedown listener should be registered
    And click listener should be registered

  Scenario: Image state machine transitions use proper validation
    Given I am in a valid state
    When I attempt to transition to a new state
    Then the state transition should be validated
    And setup functions should be called
    And cleanup functions should be called

  Note:
    This test suite is currently skipped because it needs to be rewritten
    for the refactored API. The old API with global functions
    (transitionState, currentState, etc.) no longer exists.
    The refactored version uses a proper StateMachine class.
