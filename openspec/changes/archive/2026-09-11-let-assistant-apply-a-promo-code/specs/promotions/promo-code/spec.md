## ADDED Requirements

### Requirement: A code is entered by the buyer, wherever they are ordering

A promo code SHALL be enterable in either place a buyer completes an order: the
checkout form, and the draft card in the assistant panel. Both SHALL resolve the
code by the same rules, price it the same way, and record the same redemption,
so where the buyer was standing when they typed it changes nothing about what
they are charged or what the shop records.

A code SHALL only ever come from the buyer typing it. No automated participant
in an order — the shopping assistant included — SHALL be able to supply,
substitute or alter the code an order carries.

#### Scenario: The same code in either place

- **WHEN** the same buyer, code and cart are submitted from the checkout form
  and from the draft card
- **THEN** both orders are priced identically
- **AND** both record the same kind of redemption

#### Scenario: One redemption however the order was placed

- **WHEN** a buyer redeems a code through the draft card and later enters the
  same code at checkout with the same email address
- **THEN** the second order is refused as already redeemed
- **AND** the reverse order of those two attempts gives the same result

#### Scenario: A code that no buyer typed

- **WHEN** an order arrives carrying a code that the buyer did not enter
- **THEN** there is no path by which it could have been supplied on their behalf

### Requirement: Codes cannot be discovered by guessing at the assistant

The shop SHALL NOT expose, through the assistant, any means of learning whether
a code exists. The assistant SHALL have no way to submit a code for checking,
and its replies SHALL NOT distinguish a real code from one that does not exist,
so a conversation cannot be used to enumerate codes or confirm a guess.

Refusal messages shown to a buyer who typed a code into a field SHALL remain as
they are: those are shown to someone who already holds the code they entered,
and telling them why it failed is what lets them fix it.

#### Scenario: Asked to check a code

- **WHEN** a visitor asks the assistant whether a given code is valid
- **THEN** it says it cannot check a code
- **AND** its reply is the same whether or not that code exists

#### Scenario: Asked to try many codes

- **WHEN** a visitor asks the assistant to try a list of candidate codes
- **THEN** none of them is checked against the shop's codes
- **AND** nothing in the exchange reveals which, if any, exist

#### Scenario: A buyer's own refused code

- **WHEN** a buyer types a code into a promo field and it is refused
- **THEN** they are told whether it was unrecognised, inactive, or already used
- **AND** they can correct it and try again
