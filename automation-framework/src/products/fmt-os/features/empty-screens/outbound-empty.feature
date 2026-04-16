@fmt-os @inventory @empty-screens
Feature: Outbound — empty screens verification (FMT OS)

  Background:
    Given I navigate to Outbound screen
    When I search outbound for "xyzabc123notexist"

  @smoke
  Scenario: Outbound tabs show correct empty-state copy
    Then I verify outbound empty state on "Pending for Unloading" tab with primary "No shipments pending unloading" and supporting "Dispatched shipments awaiting unloading at the warehouse will appear here."
    And I verify outbound empty state on "Unloading Completed" tab with primary "No completed unloadings" and supporting "Shipments that have been successfully unloaded will appear here."
    And I verify outbound empty state on "All" tab with primary "No outbound records found" and supporting "All outbound shipments across different stages will appear here once created."

