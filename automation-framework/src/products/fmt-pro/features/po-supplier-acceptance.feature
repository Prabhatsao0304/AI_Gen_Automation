@fmt-pro @purchase-order @po-supplier-acceptance @supplier
Feature: Purchase Order Supplier Acceptance - Farmart App

  Background:
    Given I am logged in to FMT PRO

  @regression
  Scenario: Supplier accepts PO using shared link from FMT PRO
    Given I have a target PO number for supplier acceptance
    When I open the target PO details in FMT PRO for sharing
    And I copy supplier link by clicking Share in FMT PRO
    And I open the copied supplier link in Farmart App
    And I login in Farmart App with supplier mobile and otp
    And I accept the PO in Farmart App
    Then supplier PO acceptance should be successful in Farmart App
