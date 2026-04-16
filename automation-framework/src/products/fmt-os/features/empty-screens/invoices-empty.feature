@fmt-os @finance @empty-screens
Feature: Invoices — empty screens verification (FMT OS)

  Background:
    Given I navigate to Invoices screen
    When I search invoices for "xyzabc123notexist"

  @smoke
  Scenario: Invoices tabs show correct empty-state copy
    Then I verify invoices empty state on "Invoice Requests" tab with primary "No invoice requests" and supporting "New invoice requests will appear here once generated from orders."
    And I verify invoices empty state on "Credit & Debit Notes" tab with primary "No credit or debit notes" and supporting "Credit and debit notes raised for invoice adjustments will appear here."
    And I verify invoices empty state on "To Cancel / Settle" tab with primary "No invoices to cancel or settle" and supporting "Invoices pending cancellation or settlement actions will appear here."
    And I verify invoices empty state on "Completed Invoices" tab with primary "No completed invoices" and supporting "Successfully generated and finalized invoices will appear here."
    And I verify invoices empty state on "Cancelled Invoices" tab with primary "No cancelled invoices" and supporting "Invoices that have been cancelled will appear here for reference."
    And I verify invoices empty state on "All Invoices" tab with primary "No invoices found" and supporting "All invoices across different stages will appear here once created."

