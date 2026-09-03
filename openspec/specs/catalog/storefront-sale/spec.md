# catalog/storefront-sale Specification

## Purpose

Defines a single, store-wide percentage discount that staff turn on and set
through the database, and how that discount reaches every price the buyer
sees or pays, without becoming a second source of pricing.

## Requirements

### Requirement: The sale has one on/off switch and one percentage

The store SHALL hold exactly one sale state: whether a sale is active, and a
percentage to discount by. There SHALL be no per-product, per-category or
scheduled variant of it. The percentage SHALL be a whole or fractional number
greater than 0 and less than or equal to 100.

#### Scenario: Sale turned on

- **WHEN** staff set the sale active and its percentage in the database
- **THEN** every price the storefront shows or charges reflects that discount

#### Scenario: Sale turned off

- **WHEN** staff set the sale inactive
- **THEN** every price the storefront shows or charges returns to the item's
  recorded price, with no discount applied

#### Scenario: Percentage out of range is rejected

- **WHEN** staff attempt to record a sale percentage of 0, a negative number,
  or a number above 100
- **THEN** the database rejects the value and the previously stored sale state
  is unchanged

### Requirement: The discount is computed server-side, once

The discounted price of an item SHALL be computed from its recorded price and
the current sale state on the server. The browser SHALL NOT compute, submit,
or be trusted for a discounted price. The same computation SHALL produce the
price shown to a buyer before checkout and the price recorded on their order,
so nothing shown to a buyer changes at the moment they submit it.

#### Scenario: Displayed price matches charged price

- **WHEN** a buyer views an item while a sale is active, adds it to their
  cart, and submits an order
- **THEN** the unit price recorded on the order line equals the discounted
  price they were shown

#### Scenario: Tampered discount is ignored

- **WHEN** an order is submitted directly to the order endpoint carrying a
  client-supplied discounted price
- **THEN** the recorded line uses the server-computed price, not the
  submitted one

#### Scenario: Sale changes between viewing and ordering

- **WHEN** staff change the sale state after a buyer has loaded a page but
  before they submit their order
- **THEN** the order is priced at the sale state in effect at submission time,
  not the one the buyer originally saw

### Requirement: A sale is visible everywhere a price appears

While a sale is active, everywhere the storefront shows an item's price to a
buyer SHALL show both the original price and the discounted price, and SHALL
state the discount percentage. When no sale is active, the storefront SHALL
show only the item's plain price, with no discount language or struck-through
price.

#### Scenario: Sale active on a listing

- **WHEN** a buyer views the product or file listing while a sale is active
- **THEN** each item shows its original price struck through, its discounted
  price, and the discount percentage

#### Scenario: Sale active on item detail, cart and checkout

- **WHEN** a buyer views an item's detail page, their cart, or the checkout
  summary while a sale is active
- **THEN** the same original price, discounted price and percentage are shown
  there, and totals are computed from discounted prices

#### Scenario: No sale active

- **WHEN** no sale is active
- **THEN** the storefront shows each item's plain recorded price only

### Requirement: A sale applies to every catalogue item alike

The discount SHALL apply uniformly to every item in the catalogue, physical
and digital, with no item excluded or discounted at a different rate.

#### Scenario: Mixed order during a sale

- **WHEN** a buyer orders a physical object and a file item while a sale is
  active
- **THEN** both lines are discounted at the same percentage
