@fmt-os @procurement @search
Feature: Purchase Order Search — FMT OS

  Background:
    Given I navigate to Purchase Order screen

  @smoke
  Scenario: Search bar is visible and accepts text input
    Then the search bar should be visible
    When I type "xyzabc123notexist" in the search bar
    Then the search bar should contain "xyzabc123notexist"

  @smoke
  Scenario: Non matching search stays applied across all purchase order tabs
    When I type "xyzabc123notexist" in the search bar
    Then I verify empty state on "Review PO" tab with message "No purchase orders to review"
    And the search bar should contain "xyzabc123notexist"
    And I verify empty state on "Map SO" tab with message "No purchase orders to map"
    And the search bar should contain "xyzabc123notexist"
    And I verify empty state on "In Progress" tab with message "No purchase orders in progress"
    And the search bar should contain "xyzabc123notexist"
    And I verify empty state on "Completed" tab with message "No completed purchase orders"
    And the search bar should contain "xyzabc123notexist"
    And I verify empty state on "All" tab with message "No purchase orders found"
    And the search bar should contain "xyzabc123notexist"

  @regression
  Scenario: Search on a non default tab uses that active tab context
    When I open the "Map SO" tab
    And I type "xyzabc123notexist" in the search bar
    Then the "Map SO" tab should be active
    And I verify empty state on "Map SO" tab with message "No purchase orders to map"

  @regression
  Scenario: Special character search shows no matching purchase orders
    When I type "@#$%" in the search bar
    Then I verify empty state on "Review PO" tab with message "No purchase orders to review"
    And the search bar should contain "@#$%"

  @regression
  Scenario: Long text search is handled without breaking the purchase order screen
    When I type "purchase-order-search-validation-string-1234567890-long-input" in the search bar
    Then I verify empty state on "Review PO" tab with message "No purchase orders to review"
    And the search bar should contain "purchase-order-search-validation-string-1234567890-long-input"

  @regression
  Scenario: Whitespace only search keeps the purchase order screen stable
    When I type "   " in the search bar
    Then all purchase order tabs should be visible
    And the "Review PO" tab should be active

  @regression
  Scenario: Leading and trailing spaces are trimmed in search input
    When I type "  trim-check-123  " in the search bar
    Then the search bar should be trimmed to "trim-check-123"
    And I verify empty state on "Review PO" tab with message "No purchase orders to review"

  @regression
  Scenario: Clearing search resets the search input
    When I type "xyzabc123notexist" in the search bar
    And I clear the search bar
    Then the search bar should be empty
    And all purchase order tabs should be visible
