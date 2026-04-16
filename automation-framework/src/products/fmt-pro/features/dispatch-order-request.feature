@fmt-pro @dispatch-order @do-request @do-create
Feature: Dispatch Order Request - FMT PRO

  Background:
    Given I am logged in to FMT PRO

  @smoke
  Scenario: Create dispatch order and upload required dispatch documents
    Given I have a target PO number for dispatch order
    When I open the target PO details in FMT PRO for dispatch order
    And I click Create Dispatch Order in FMT PRO
    And I fill transport details vehicle "CG09UI9090" and driver mobile "9886293565" in FMT PRO
    And I submit transport details in FMT PRO
    Then transport details should be added successfully in FMT PRO
    When I click Add Dispatch Details in FMT PRO
    And I upload dispatch order documents in FMT PRO
    Then dispatch order document uploads should be successful in FMT PRO
    When I proceed to dispatch charges form in FMT PRO
    Then net weight and number of bags should be auto-filled in FMT PRO
    When I set bag deduction "0" and mandi tax "0" in FMT PRO dispatch form
    And I submit dispatch order request in FMT PRO
