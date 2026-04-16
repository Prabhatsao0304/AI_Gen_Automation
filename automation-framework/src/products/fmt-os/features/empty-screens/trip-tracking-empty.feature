@fmt-os @logistics @empty-screens
Feature: Trip Tracking — empty screens verification (FMT OS)

  Background:
    Given I navigate to Trip Tracking screen
    When I search trip tracking for "xyzabc123notexist"

  @smoke
  Scenario: Trip Tracking tabs show correct empty-state copy
    Then I verify trip tracking empty state on "Trip Not Created" tab with primary "No trips pending creation" and supporting "Orders awaiting trip creation will appear here. Create trips to initiate tracking."
    And I verify trip tracking empty state on "Consent Pending" tab with primary "No trips awaiting consent" and supporting "Trips pending required approvals or consent will appear here before dispatch."
    And I verify trip tracking empty state on "In-Transit" tab with primary "No trips in transit" and supporting "Trips currently on the move will appear here for live tracking."
    And I verify trip tracking empty state on "Arrived" tab with primary "No arrived trips" and supporting "Trips that have reached the destination will appear here."
    And I verify trip tracking empty state on "Terminated" tab with primary "No terminated trips" and supporting "Trips that were cancelled or terminated will appear here for reference."
    And I verify trip tracking empty state on "Completed" tab with primary "No completed trips" and supporting "Successfully completed trips will appear here. Track delivery history and outcomes."
    And I verify trip tracking empty state on "All Trips" tab with primary "No trips found" and supporting "All trips across different stages will appear here once created."

