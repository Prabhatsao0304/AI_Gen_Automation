@fmt-os @procurement @po-approval @shp
Feature: Purchase Order Approval - FMT OS

  Background:
    Given I navigate to Purchase Order screen

  @regression
  Scenario: SHP approves a requested purchase order from Review PO
    Given I have a target PO number for SHP approval in FMT OS
    When I search and open the target PO from Review PO in FMT OS
    And I approve the opened PO as SHP in FMT OS
    Then the target PO should move to approval pending stage in FMT OS
