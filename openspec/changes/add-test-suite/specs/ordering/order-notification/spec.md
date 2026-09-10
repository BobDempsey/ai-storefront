## ADDED Requirements

### Requirement: A test order does not notify staff

When a committed order carries the test marker, the system SHALL NOT send the
staff notification email for it. The order is still committed and still records
how it was priced; only the notification is withheld, so a test run cannot put
fake business in the owner's inbox.

Suppressing the notification SHALL NOT be reported to the caller as a delivery
failure. An order created as a test and not emailed is a success, not the
partial failure the storefront reports when a real order commits but its email
does not send.

#### Scenario: A test order is placed

- **WHEN** an order carrying the test marker is committed
- **THEN** no staff notification is sent
- **AND** the response reports the order as placed, with no email failure

#### Scenario: A real order is unaffected

- **WHEN** an order without the test marker is committed
- **THEN** the staff notification is sent as before
