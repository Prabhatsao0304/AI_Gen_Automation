@fmt-os @sales @empty-screens
Feature: Sales Order — empty screens verification (FMT OS)

  Background:
    Given I navigate to Sales Order screen
    When I search sales order for "xyzabc123notexist"

  @smoke
  Scenario: Sales Order tabs show correct empty-state copy
    Then I verify sales order empty state on "Add Margin" tab with primary "No sales orders for margin addition" and supporting "Sales orders requiring margin addition will appear here. Add margin to proceed with processing."
    And I verify sales order empty state on "Margin Approval" tab with primary "No margin approvals pending" and supporting "Sales orders awaiting margin approval will appear here for your review."
    And I verify sales order empty state on "Risk Approval" tab with primary "No risk approvals pending" and supporting "Sales orders flagged for risk assessment will appear here for your approval."
    And I verify sales order empty state on "In Progress" tab with primary "No sales orders in progress" and supporting "Sales orders currently being processed will appear here."
    And I verify sales order empty state on "To Complete" tab with primary "No sales orders to complete" and supporting "Sales orders pending final steps will appear here. Complete them to close the order."
    And I verify sales order empty state on "Completed" tab with primary "No completed sales orders" and supporting "Successfully completed sales orders will appear here. Track your order history and fulfillment status."
    And I verify sales order empty state on "Rejected" tab with primary "No rejected sales orders" and supporting "Sales orders that were rejected will appear here for review or follow-up."
    And I verify sales order empty state on "All" tab with primary "No sales orders found" and supporting "All sales orders across different stages will appear here once created."

