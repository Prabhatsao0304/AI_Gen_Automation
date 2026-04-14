@fmt-os @procurement
Feature: Purchase Order — FMT OS

  Background:
    Given I navigate to Purchase Order screen

  @smoke
  Scenario: Purchase Order screen loads with Review PO tab active by default
    Then the "Review PO" tab should be active

  @smoke
  Scenario: Search empty state verified across all tabs in one go
    When I type "xyzabc123notexist" in the search bar
    Then I verify empty state on "Review PO" tab with message "No purchase orders to review"
    And I verify empty state on "Map SO" tab with message "No purchase orders to map"
    And I verify empty state on "In Progress" tab with message "No purchase orders in progress"
    And I verify empty state on "Completed" tab with message "No completed purchase orders"
    And I verify empty state on "All" tab with message "No purchase orders found"
