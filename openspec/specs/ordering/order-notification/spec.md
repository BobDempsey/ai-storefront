# ordering/order-notification Specification

## Purpose

Defines what the staff order notification states about how an order was
priced, and the record on the committed order that the notification is written
from, so staff can reconcile a discounted total against the catalogue without
guessing which offer produced it.

## Requirements

### Requirement: A committed order records the discount that priced it

When an order is created with a discount applied, the committed order SHALL
record which offer produced it, the percentage applied, the promo code as
matched when a code was the offer, and the order's total before the discount.
These SHALL be written in the same transaction that prices the lines, so an
order either records its discount or does not exist.

A later change to the store-wide sale, to a promo code's percentage, or to a
promo code's active state SHALL NOT alter what an already-committed order
records.

#### Scenario: An order priced by a promo code

- **WHEN** an order is placed with a valid promo code that produced the discount
- **THEN** the committed order records the code as matched and its percentage
- **AND** it records that a promo code, not the store sale, was the offer applied
- **AND** it records the total the order would have had at catalogue prices

#### Scenario: An order priced by the store-wide sale

- **WHEN** an order is placed while a store-wide sale produced the discount
- **THEN** the committed order records the sale as the offer applied and its percentage
- **AND** it records no promo code

#### Scenario: An order with no discount

- **WHEN** an order is placed with no code and no active sale
- **THEN** the committed order records no offer and a zero percentage
- **AND** its pre-discount total equals its total

#### Scenario: The sale percentage changes after the order

- **WHEN** staff change the store-wide sale percentage after an order was committed
- **THEN** that order still records the percentage that priced it
- **AND** its recorded total before the discount is unchanged

### Requirement: The staff notification states how a discounted order was priced

The notification sent to staff for a discounted order SHALL state the order's
total before the discount, the discount applied, and the total charged, so the
difference between the catalogue price and the amount owed is legible without
recomputing it. A notification for an undiscounted order SHALL state the total
alone and SHALL NOT show an empty or zero discount.

#### Scenario: A discounted order reaches the inbox

- **WHEN** staff receive the notification for an order that was discounted
- **THEN** it states the total before the discount, the discount, and the total charged
- **AND** the three are consistent with each other

#### Scenario: An undiscounted order reaches the inbox

- **WHEN** staff receive the notification for an order that was not discounted
- **THEN** it states the total
- **AND** it shows no discount line and no pre-discount total

### Requirement: The notification names which offer applied

A promo code and a store-wide sale produce the same arithmetic, and only one of
them ever applies to an order. The notification SHALL name which one did: a
promo code by the code itself and its percentage, a sale as the store-wide sale
and its percentage. It SHALL NOT present both as having applied.

#### Scenario: A code beat the sale

- **WHEN** a buyer's code was worth more than the active sale and priced the order
- **THEN** the notification names the code and the code's percentage
- **AND** it does not state that the sale discounted the order

#### Scenario: The sale beat the code

- **WHEN** an active sale was worth more than the code the buyer applied and priced the order
- **THEN** the notification names the store-wide sale and the sale's percentage
- **AND** it does not present the code as the discount that applied

### Requirement: The notification never asserts a discount it did not read

Where the committed order could not be read back, or predates the recording of
discounts, the notification SHALL NOT state a discount, a percentage, or a
pre-discount total. It SHALL remain clear that the figures shown are the ones
that were read, consistent with how an unreadable order is already reported.

#### Scenario: The order cannot be read back after it is committed

- **WHEN** the server cannot re-read a committed order to build the notification
- **THEN** the notification states no discount and no pre-discount total
- **AND** it still carries the existing warning that its figures are unreliable

#### Scenario: An order recorded before discounts were recorded

- **WHEN** a notification is built for an order that carries no discount record
- **THEN** it states no discount rather than a zero one

### Requirement: Values interpolated into the notification are escaped

A promo code is text staff enter and a buyer submits, and the notification is
HTML. Every value interpolated into it, the code included, SHALL be escaped so
it renders as text in the staff inbox and cannot introduce markup.

#### Scenario: A code containing markup characters

- **WHEN** a notification names a promo code whose text contains HTML characters
- **THEN** those characters render as text in the inbox
- **AND** no markup is introduced into the email
