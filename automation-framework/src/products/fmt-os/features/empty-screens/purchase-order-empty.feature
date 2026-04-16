@fmt-os @procurement @empty-screens
Feature: Purchase Order — empty screens verification (FMT OS)

  Background:
    Given I navigate to Purchase Order screen

  @smoke
  Scenario: Purchase Order search shows correct empty state copy across tabs
    When I type "xyzabc123notexist" in the search bar
    Then I verify empty state on "Review PO" tab with message "No purchase orders to review"
    And I verify empty state on "Map SO" tab with message "No purchase orders to map"
    And I verify empty state on "In Progress" tab with message "No purchase orders in progress"
    And I verify empty state on "Completed" tab with message "No completed purchase orders"
    And I verify empty state on "All" tab with message "No purchase orders found"

