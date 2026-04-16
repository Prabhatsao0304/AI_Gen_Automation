@fmt-pro @purchase-order @po-request @create-po
Feature: Purchase Order Request - FMT PRO

  Background:
    Given I am logged in to FMT PRO

  @smoke
  Scenario: Raise Purchase Order Request from Purchase Order bottom tab
    When I click Purchase Order bottom tab in FMT PRO
    And I click Create Purchase Order plus icon in FMT PRO
    Then Purchase Order screen should be visible in FMT PRO
    And Purchase Order Request form should be visible in FMT PRO
    When I click Select Supplier dropdown in FMT PRO
    And I select supplier "vimal traders" in FMT PRO
    When I click Next in Purchase Order Request form in FMT PRO
    Then Purchase Order Request form should continue after supplier selection in FMT PRO
    When I select crop "maize" and variety "yellow" in FMT PRO
    And I enter PO quantity "100" in FMT PRO
    And I select packaging type "Jute" in FMT PRO
    And I select order type "FOR" in FMT PRO
    And I select today's date in Expected Delivery in FMT PRO
    And I select "Supplier" in quality claim and unloading charge sections in FMT PRO
    And I fill payment terms loading "0" unloading "100" and buyer claim "0" in FMT PRO
    And I click Next to continue from payment terms in FMT PRO
    And I enter supplier price "3000" in FMT PRO
    And I enter bag deduction "0" in FMT PRO
    And I set mandi tax to "No" in FMT PRO
    And I submit Purchase Order Request in FMT PRO
    Then Purchase Order successful screen should be visible in FMT PRO
    When I click View PO summary in FMT PRO
    Then I capture PO number from PO details screen in FMT PRO
