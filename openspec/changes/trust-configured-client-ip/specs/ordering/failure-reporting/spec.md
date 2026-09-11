## ADDED Requirements

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
