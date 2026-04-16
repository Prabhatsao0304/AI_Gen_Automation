@fmt-os @finance @empty-screens
Feature: Payments — empty screens verification (FMT OS)

  Background:
    Given I navigate to Payments screen
    When I search payments for "xyzabc123notexist"

  @smoke
  Scenario: Payments tabs show correct empty-state copy
    Then I verify payments empty state on "To Review" tab with primary "No payments to review" and supporting "Payments awaiting your review and approval will appear here."
    And I verify payments empty state on "To Pay" tab with primary "No payments to process" and supporting "Approved payments pending processing will appear here. Complete them to initiate payment."
    And I verify payments empty state on "Failed" tab with primary "No failed payments" and supporting "Payments that failed during processing will appear here for retry or investigation."
    And I verify payments empty state on "Rejected" tab with primary "No rejected payments" and supporting "Payments that were rejected will appear here for review or follow-up."
    And I verify payments empty state on "In Process" tab with primary "No payments in process" and supporting "Payments currently being processed will appear here."
    And I verify payments empty state on "Non-Payment" tab with primary "No non-payment cases" and supporting "Transactions marked as non-payment will appear here for tracking and reference."
    And I verify payments empty state on "Paid" tab with primary "No completed payments" and supporting "Successfully processed payments will appear here. Track your payment history and status."

