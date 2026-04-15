@<product-tag> @<module-tag>
Feature: <Feature Name> — <Product Name>

  Background:
    Given I navigate to <Feature Name> screen

  @smoke
  Scenario: <Primary happy path>
    Then <expected outcome>

  @regression
  Scenario: <Important edge case>
    When <action>
    Then <expected outcome>
