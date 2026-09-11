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

### Requirement: A rate-limited route identifies its caller from a trusted source only

Every rate-limited route SHALL resolve the caller's address from a source the
deployment trusts: a header named by the deployment's own configuration, or
failing that the address of the connection itself.

A forwarded header the deployment has not named SHALL NOT be read. A value the
client supplies is not an identity, and a limiter keyed on one can be reset at
will by sending a different value.

Where the trusted header carries several values, the system SHALL take the last
one. The last value is the one the trusted proxy appended; earlier values
arrived with the request and are therefore as untrusted as the client.

#### Scenario: A deployment behind its configured proxy

- **WHEN** a request arrives carrying the deployment's configured trusted header
- **THEN** the caller is identified by that header's last value
- **AND** any other forwarded header on the request is ignored

#### Scenario: A client sends a forwarded header the deployment does not trust

- **WHEN** a request arrives with a forwarded header the deployment has not configured
- **THEN** that header is ignored
- **AND** the caller is identified by the connection's own address
- **AND** sending a different value on the next request does not give the caller a fresh allowance

#### Scenario: No proxy at all

- **WHEN** the deployment names no trusted header and the request arrives directly
- **THEN** the caller is identified by the connection's own address

### Requirement: A caller is identified by the connection when no trusted header applies

When the deployment's trusted header is absent, the system SHALL identify the
caller by the address of the connection the request arrived on. Where the
platform exposes that address in more than one place, the system SHALL try each
before giving up.

#### Scenario: A request arriving with no forwarded header

- **WHEN** a rate-limited route receives a request carrying no trusted header
- **THEN** the caller is identified by the connection's address
- **AND** two requests from the same connection share one allowance

### Requirement: An unidentifiable caller is pooled, and the operator is told

When no address can be resolved at all, the system SHALL still apply the limit,
placing every such request in one shared bucket, and SHALL write to the server
log that it could not identify the caller.

This is the weakest of the three outcomes and it is chosen deliberately.
Refusing these requests outright would take the shop offline wherever the
platform exposes no address, which is the case in local development. Serving
them unlimited would be a documented way around every limit. Pooling keeps a
limit in force; the log is what stops the situation from going unnoticed.

The customer SHALL be told nothing about headers, proxies or configuration.
Those are facts about the server.

#### Scenario: The platform exposes no address

- **WHEN** a rate-limited route can resolve neither a trusted header nor a connection address
- **THEN** the request is still subject to the route's limit
- **AND** the server log records that the caller could not be identified
- **AND** any refusal the customer sees names no header, proxy or setting

#### Scenario: Pooled callers are still limited

- **WHEN** more unidentifiable requests arrive than the route's limit allows
- **THEN** the ones past the limit are refused
