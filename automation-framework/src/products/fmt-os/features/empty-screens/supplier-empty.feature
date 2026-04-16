@fmt-os @procurement @empty-screens
Feature: Supplier — empty screens verification (FMT OS)

  Background:
    Given I navigate to Supplier screen
    When I search supplier for "xyzabc123notexist"

  @smoke
  Scenario: Supplier tabs show correct empty-state copy
    Then I verify supplier empty state on "Consent Pending" tab with primary "No consent pending" and supporting "Supplier consent requests will appear here once they're awaiting approval."
    And I verify supplier empty state on "To Review" tab with primary "No suppliers to review" and supporting "New supplier KYC documents will appear here for your review and approval."
    And I verify supplier empty state on "Rejected" tab with primary "No rejected suppliers" and supporting "Suppliers whose KYC documents were rejected will appear here for resubmission or follow-up."
    And I verify supplier empty state on "Approved" tab with primary "No approved suppliers yet" and supporting "Once you approve supplier KYC documents, they'll appear here. Start by reviewing pending submissions."

