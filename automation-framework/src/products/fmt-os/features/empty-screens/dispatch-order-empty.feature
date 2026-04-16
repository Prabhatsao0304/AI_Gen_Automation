@fmt-os @procurement @empty-screens
Feature: Dispatch Order — empty screens verification (FMT OS)

  Background:
    Given I navigate to Dispatch Order screen
    When I search dispatch order for "xyzabc123notexist"

  @smoke
  Scenario: Dispatch Order tabs show correct empty-state copy
    Then I verify dispatch order empty state on "Review Dispatch" tab with primary "No dispatches to review" and supporting "New dispatch orders will appear here for your review and approval before shipment."
    And I verify dispatch order empty state on "Review Payment" tab with primary "No payment reviews pending" and supporting "Dispatch orders with pending payment reviews will appear here. Approve payments to proceed with dispatch."
    And I verify dispatch order empty state on "Review GRN" tab with primary "No GRNs to review" and supporting "Goods Receipt Notes (GRN) requiring your review will appear here once goods are received at the destination."
    And I verify dispatch order empty state on "Review Deduction" tab with primary "No deductions to review" and supporting "Dispatch orders with quality deductions, weight differences, or other adjustments will appear here for your approval."
    And I verify dispatch order empty state on "To Complete" tab with primary "No dispatch orders to complete" and supporting "Dispatch orders awaiting final completion steps will appear here. Complete them to close the order."
    And I verify dispatch order empty state on "Completed" tab with primary "No completed dispatches" and supporting "Successfully completed dispatch orders will appear here. Track your fulfillment history and delivery confirmations."
    And I verify dispatch order empty state on "All" tab with primary "No dispatch orders found" and supporting "All dispatch orders across different stages will appear here once created."

