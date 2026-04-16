@fmt-os @sales @empty-screens
Feature: Buyers — empty screens verification (FMT OS)

  Background:
    Given I navigate to Buyers screen
    When I search buyers for "xyzabc123notexist"

  @smoke
  Scenario: Buyers tabs show correct empty-state copy
    Then I verify buyers empty state on "Sales Review" tab with primary "No buyers to review" and supporting "New buyer onboarding requests will appear here for your review and approval."
    And I verify buyers empty state on "Risk Review" tab with primary "No buyers for risk review" and supporting "Buyers requiring risk assessment will appear here for your evaluation."
    And I verify buyers empty state on "Approved" tab with primary "No approved buyers" and supporting "Buyers who have been successfully onboarded and approved will appear here."
    And I verify buyers empty state on "Rejected" tab with primary "No rejected buyers" and supporting "Buyers whose onboarding was rejected will appear here for review or follow-up."
    And I verify buyers empty state on "All" tab with primary "No buyers found" and supporting "All buyers across different stages will appear here once onboarded."

