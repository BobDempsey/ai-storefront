# ordering/test-order Specification

## Purpose

Defines what marks an order as a test rather than real business, so an
automated suite can exercise the live order path without producing work a staff
member would act on or rows a human has to identify and clean up by hand.

## Requirements

### Requirement: An order records whether it is a test

Every committed order SHALL carry a boolean marker stating whether it is a
test. An order created without stating one SHALL be recorded as not a test, so
a caller that knows nothing about testing cannot accidentally create a test
order.

The marker SHALL be written in the same transaction that commits the order and
its lines, so an order either records what it is or does not exist.

#### Scenario: An ordinary customer order

- **WHEN** an order is placed through the storefront checkout
- **THEN** the committed order records that it is not a test

#### Scenario: An order created by an automated test

- **WHEN** an order is created with the test marker set
- **THEN** the committed order records that it is a test
- **AND** its line items and any promo redemption are committed as usual

### Requirement: Only a caller holding the server's test secret may declare a test order

The order API SHALL treat a request as a test order only when it presents the
secret the server holds for that purpose. A request without it, or with a wrong
one, SHALL produce an ordinary order, whatever the request claims.

The secret SHALL NOT be sent to the browser, and the check SHALL run the same
way in every environment, so the path a test exercises is the path production
runs.

When no secret is configured on the server, no request SHALL be able to declare
a test order.

#### Scenario: A request presenting the correct secret

- **WHEN** an order request presents the server's test secret and asks for a test order
- **THEN** the committed order records that it is a test

#### Scenario: A request with a wrong or missing secret

- **WHEN** an order request asks for a test order without the secret, or with the wrong one
- **THEN** the committed order records that it is not a test
- **AND** the request is not rejected: it is an ordinary order

#### Scenario: No secret configured

- **WHEN** the server holds no test secret and a request asks for a test order
- **THEN** the committed order records that it is not a test

### Requirement: A test order does not spend the customer rate-limit allowance

A request that presents the server's test secret SHALL NOT count against the
per-caller order rate limit, and SHALL NOT be refused by it. Every request that
does not present the secret SHALL be limited exactly as before.

Automated runs share one address with real traffic on the same machine, so a
suite that spent the allowance would fail on its own second run rather than on
anything about the code.

#### Scenario: A suite places more orders than the limit allows

- **WHEN** more orders than the limit are placed in the window, all presenting the secret
- **THEN** every one of them is accepted

#### Scenario: An ordinary caller is still limited

- **WHEN** a caller without the secret exceeds the limit in the window
- **THEN** the request is refused, as it was before

### Requirement: A test order is priced exactly like a real one

A test order SHALL go through the same pricing, the same store-wide sale and
the same promo-code rules as a real order, and SHALL record the same discount
detail. The marker changes what the system does with the order after it is
committed, never what the order costs.

#### Scenario: A test order placed while a sale is active

- **WHEN** a test order is placed for a product the store-wide sale covers
- **THEN** its total is the sale total, identical to a real order for the same cart
- **AND** it records the same discount detail a real order would record

### Requirement: A test order is distinguishable in the data

Staff SHALL be able to separate test orders from real ones without inspecting
the customer's name, email or notes. Any listing or total that represents
business the store has to fulfil SHALL be able to exclude test orders by the
marker alone.

#### Scenario: Reading the orders staff must act on

- **WHEN** orders are read for a view of outstanding business
- **THEN** orders carrying the test marker can be excluded by that marker
- **AND** no test order appears among them
