## Purpose

Defines what the storefront may say when an order or cart operation fails —
which failures are described to the customer, in what terms, what detail is
kept to the server log, and what an API response is allowed to assert about an
order it could not fully read.

## Requirements

### Requirement: Internal failure detail never reaches the customer

When a request fails because of an internal fault — a database error, a
misconfiguration, an unhandled exception — the response body SHALL carry only a
message written for the customer. It SHALL NOT carry text produced by the
database, the driver or any other internal component, and SHALL NOT name
internal tables, columns, queries or hosts. The underlying detail SHALL be
logged on the server so it remains available for diagnosis.

#### Scenario: The catalogue query fails while pricing a cart

- **WHEN** the cart preview request cannot read the catalogue because of a database fault
- **THEN** the response says the cart could not be priced, in the customer's terms
- **AND** the response contains no database-produced text
- **AND** the underlying error is written to the server log

#### Scenario: Rejections that are the customer's to fix are still specific

- **WHEN** a request is refused for a reason the customer can act on, such as an unavailable product or an invalid form
- **THEN** the response still explains what to do about it
- **AND** it remains free of internal detail

### Requirement: An order response never asserts a total it did not read

An order is created by the database in a single transaction, and its committed
row is the record. Where the server cannot read that row back, the response
SHALL still return the order's identifier, and SHALL NOT state a total. A total
SHALL appear in the response only when it was actually read from the committed
order.

#### Scenario: The re-read fails after the order is committed

- **WHEN** an order is committed and the follow-up read of that order fails
- **THEN** the customer's request still succeeds and returns the order id
- **AND** the response does not state a total
- **AND** the failure is logged on the server

#### Scenario: The re-read succeeds

- **WHEN** an order is committed and read back successfully
- **THEN** the response states the total held in the committed order

### Requirement: The confirmation never presents an unread total as real

The order confirmation shown to the customer SHALL always identify the order,
and SHALL present a total only when the response carried one. Where no total is
available, the confirmation SHALL say the amount will be confirmed by email
rather than showing a placeholder figure such as zero.

#### Scenario: Confirmation for an order whose total could not be read

- **WHEN** the customer reaches the confirmation for an order whose total was not returned
- **THEN** the order reference is shown
- **AND** no monetary total is shown
- **AND** the customer is told the amount will be confirmed by email

#### Scenario: Confirmation for an ordinary order

- **WHEN** the customer reaches the confirmation for an order whose total was returned
- **THEN** the order reference is shown, and the total may be shown alongside it
