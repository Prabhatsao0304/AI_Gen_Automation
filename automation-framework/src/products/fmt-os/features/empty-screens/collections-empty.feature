@fmt-os @finance @empty-screens
Feature: Collections — empty screens verification (FMT OS)

  Background:
    Given I navigate to Collections screen
    When I search collections for "xyzabc123notexist"

  @smoke
  Scenario: Collections tabs show correct empty-state copy
    Then I verify collections empty state on "Pending" tab with primary "No pending collections" and supporting "Incoming payments awaiting mapping to buyers or orders will appear here."
    And I verify collections empty state on "Partially Mapped" tab with primary "No partially mapped collections" and supporting "Payments that are partially allocated will appear here for further mapping."
    And I verify collections empty state on "Completed" tab with primary "No completed collections" and supporting "Fully mapped and processed collections will appear here."
    And I verify collections empty state on "All" tab with primary "No collections found" and supporting "All collections across different stages will appear here once received."

