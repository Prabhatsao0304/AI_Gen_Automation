@fmt-os @finance @empty-screens
Feature: Banking — empty screens verification (FMT OS)

  Background:
    Given I navigate to Banking screen
    When I search banking for "xyzabc123notexist"

  @smoke
  Scenario: Banking tabs show correct empty-state copy
    Then I verify banking empty state on "Uncategorized" tab with primary "No uncategorized transactions" and supporting "Incoming bank transactions that need to be mapped to buyers or orders will appear here."
    And I verify banking empty state on "Buyer Group Mapped" tab with primary "No mapped transactions" and supporting "Transactions mapped to buyer groups will appear here for further processing."
    And I verify banking empty state on "Completed" tab with primary "No completed transactions" and supporting "Successfully mapped and processed transactions will appear here."
    And I verify banking empty state on "All" tab with primary "No transactions found" and supporting "All bank transactions across different stages will appear here once received."

