## Purpose

Defines what a promo code is in this shop, how a buyer redeems one when placing
an order, the rule limiting each code to one order per email address, and how a
code resolves when a store-wide sale is already running.

## ADDED Requirements

### Requirement: A buyer can apply a promo code when placing an order

The checkout form SHALL accept an optional promo code alongside the buyer's
details. Leaving it empty SHALL place an ordinary order. Supplying a valid code
SHALL reduce every line of the order by the code's percentage, and the buyer
SHALL see the reduced total before the order is committed.

#### Scenario: A valid code is applied

- **WHEN** a buyer enters a code that is active and that their email address has
  not used before, and places the order
- **THEN** each line is priced at the code's percentage off the catalogue price
- **AND** the recorded order total is the reduced total
- **AND** the buyer sees that total rather than the undiscounted one

#### Scenario: No code is entered

- **WHEN** a buyer leaves the promo code field empty and places the order
- **THEN** the order is priced exactly as it would be without the field existing

### Requirement: An unusable code is refused before an order exists

A code that is unknown, inactive, or already redeemed by the buyer's email
address SHALL be refused. The buyer SHALL be told which of those it is, in terms
that do not reveal codes they did not enter, and SHALL be able to correct or
clear the field and submit again. A refused code SHALL leave no order, no order
lines and no redemption record behind.

#### Scenario: An unknown code

- **WHEN** a buyer enters a code that does not exist
- **THEN** the order is refused and the buyer is told the code is not recognised
- **AND** no order is recorded

#### Scenario: An inactive code

- **WHEN** a buyer enters a code that exists but is not active
- **THEN** the order is refused and the buyer is told the code is no longer valid
- **AND** no order is recorded

#### Scenario: Correcting a refused code

- **WHEN** a buyer whose code was refused clears the field and submits again
- **THEN** the order is placed at the undiscounted price
- **AND** they are not asked to re-enter the rest of their details

#### Scenario: Case and surrounding spaces

- **WHEN** a buyer enters a valid code in a different letter case or with
  leading or trailing spaces
- **THEN** it is accepted as that code

### Requirement: A code is redeemable once per email address

Each code SHALL be redeemable once for a given email address. When an order that
used a code is committed, the shop SHALL record that the address redeemed that
code on that order. A later order from the same address using the same code
SHALL be refused, whatever else changed about the order.

#### Scenario: A second attempt by the same address

- **WHEN** an address that already placed an order with a code enters that same
  code again
- **THEN** the order is refused and the buyer is told the code has already been
  used
- **AND** no second order is recorded

#### Scenario: A different address uses the same code

- **WHEN** an address that has never used the code enters it
- **THEN** the order is accepted and discounted

#### Scenario: The redemption is tied to its order

- **WHEN** an order using a code is committed
- **THEN** a record exists linking that code, the buyer's email address and that
  order

#### Scenario: A refused order leaves no redemption

- **WHEN** an order using a valid code is refused for an unrelated reason, such
  as an out-of-stock item
- **THEN** no redemption is recorded
- **AND** the same address can still use the code on a later order

### Requirement: A code and a store-wide sale never stack

Where a store-wide sale is active and the buyer also supplies a valid code, the
shop SHALL apply only the larger of the two percentages to each line, never
both. The buyer SHALL receive the better of the offers, and the order total
SHALL never fall below what the larger single discount produces.

#### Scenario: The code beats the sale

- **WHEN** a sale is active at 20% and a buyer applies a valid 25% code
- **THEN** each line is discounted 25%
- **AND** the total is not discounted twice

#### Scenario: The sale beats the code

- **WHEN** a sale is active at 30% and a buyer applies a valid 25% code
- **THEN** each line is discounted 30%
- **AND** the code is still recorded as redeemed by that address

#### Scenario: No sale is running

- **WHEN** no sale is active and a buyer applies a valid 25% code
- **THEN** each line is discounted 25%

### Requirement: Pricing stays on the server

The browser SHALL NOT send a price, a percentage or a discounted total, and the
shop SHALL NOT accept one. The code the buyer types SHALL be the only
promotion-related value the browser sends, and every figure that follows from it
SHALL be computed where the order is committed. The figure shown to the buyer
before committing and the figure recorded SHALL agree.

#### Scenario: A crafted submission carries its own discount

- **WHEN** a submission includes a percentage or a total of its own
- **THEN** those values are ignored
- **AND** the order is priced from the catalogue and the resolved code alone

#### Scenario: Shown total matches recorded total

- **WHEN** a buyer is shown a discounted total and confirms the order
- **THEN** the recorded total equals the total they were shown

### Requirement: Codes are managed by staff and unreachable from the browser

Promo codes and their redemptions SHALL be stored so that no unauthenticated
client can read, list, create, alter or delete them. The set of codes SHALL be
editable by staff through the shop's existing administrative access, without a
deploy. The storefront SHALL NOT list codes or reveal a code the visitor has not
already been given.

#### Scenario: A visitor tries to read the codes

- **WHEN** a client attempts to read the promo code or redemption records
  directly
- **THEN** the attempt returns nothing

#### Scenario: Staff change a code

- **WHEN** staff change a code's percentage or deactivate it
- **THEN** orders placed afterwards use the new value or refuse the code
- **AND** no deploy or restart is required

#### Scenario: Codes are not enumerable

- **WHEN** the storefront's pages and responses are inspected
- **THEN** no promo code appears that the visitor was not already sent
