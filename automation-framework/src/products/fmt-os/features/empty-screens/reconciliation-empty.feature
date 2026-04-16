@fmt-os @finance @empty-screens
Feature: Reconciliation — empty screens verification (FMT OS)

  Background:
    Given I navigate to Reconciliation screen
    When I search reconciliation for "xyzabc123notexist"

  @smoke
  Scenario: Reconciliation tabs show correct empty-state copy
    Then I verify reconciliation empty state on "Pending" tab with primary "No pending invoices" and supporting "Invoices awaiting payment application or reconciliation will appear here."
    And I verify reconciliation empty state on "Partially Paid" tab with primary "No partially paid invoices" and supporting "Invoices with partial payments applied will appear here for further reconciliation."
    And I verify reconciliation empty state on "Paid" tab with primary "No paid invoices" and supporting "Fully paid invoices will appear here once payments are applied."
    And I verify reconciliation empty state on "Reconciled" tab with primary "No reconciled invoices" and supporting "Invoices that have been fully reconciled will appear here for reference."
    And I verify reconciliation empty state on "All" tab with primary "No invoices found" and supporting "All invoices across different stages will appear here once created."

