@fmt-os @procurement
Feature: Purchase Order — FMT OS

  Background:
    Given I navigate to Purchase Order screen

  @smoke
  Scenario: Purchase Order screen loads with Review PO tab active by default
    Then the "Review PO" tab should be active
