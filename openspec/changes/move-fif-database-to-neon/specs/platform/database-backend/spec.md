# Spec Delta

## Purpose

Defines which Postgres a deployment reads and writes, how that choice is made
from configuration rather than from code, and what the storefront must do
identically whichever backend is behind it, so that moving a shop between
database hosts is a setting and not a rewrite.

## ADDED Requirements

### Requirement: The database backend is configuration, not code

A deployment SHALL choose its database backend from its own configuration at
startup. The same build SHALL be able to serve one shop from a Supabase project
and another from a plain Postgres host, with no difference in the code either
shop runs.

Where the configuration names no backend, or names one whose connection settings
are absent, the server SHALL fail with a message naming the settings it wanted
rather than starting and failing later on the first query. This matches how a
missing Supabase URL already behaves: a shop that cannot reach its data should
say so at startup, not serve a page that half works.

A deployment SHALL NOT read or write a database belonging to a different
backend than the one it is configured for, and SHALL NOT fall back to a second
backend when the first is unreachable. A shop with a broken database is a shop
that is down, which is visible; a shop quietly serving another database's rows
is not.

#### Scenario: Two shops on two backends from one build

- **WHEN** two deployments of the same build are configured with different database backends
- **THEN** each reads and writes only the database its own configuration names
- **AND** each serves its catalogue, cart pricing, orders and subscriptions the same way

#### Scenario: The backend is switched back

- **WHEN** a deployment's configuration is changed from one backend to the other and the server is restarted
- **THEN** the storefront behaves as it did before the first switch, against the newly named database

#### Scenario: A backend named but not configured

- **WHEN** a backend is named and the connection settings it needs are missing
- **THEN** the server fails at startup with a message naming the missing settings
- **AND** it does not start against any other backend

### Requirement: Behavior does not depend on the backend

Every externally observable behavior of the storefront SHALL be identical across
backends. In particular the catalogue and its search and pagination, sale and
promo-code pricing, cart preview, order placement, order email content, the
newsletter opt-in and the assistant's catalogue answers SHALL each produce the
same result for the same data whichever backend holds it.

Order placement SHALL remain one transaction on every backend: an order that
prices its lines, records its discount and redeems a promo code SHALL either
record all of it or none of it. Partially recorded orders are the failure this
requirement exists to forbid, because staff act on the email an order sends.

Monetary rounding SHALL match across backends and SHALL match the application's
own pricing rules, so that a total computed by the database and a total shown to
the customer never disagree by a cent.

#### Scenario: The same order on either backend

- **WHEN** the same cart, sale and promo code are submitted against each backend in turn
- **THEN** both record the same line prices, the same discount and the same total
- **AND** both send staff and customer emails with the same figures

#### Scenario: An order that cannot complete

- **WHEN** an order fails partway through being recorded
- **THEN** no part of it remains in the database
- **AND** the customer is told the order was not placed

#### Scenario: A sale price at a rounding boundary

- **WHEN** a discount applied to a price lands between cents
- **THEN** the database and the application round it the same way

### Requirement: A backend without row-level security says so

Where a backend has no public data API, the protection that row-level security
policies provide on Supabase SHALL NOT be assumed to exist. Such a deployment
SHALL reach its database only from server code holding credentials that are
never sent to a browser, and SHALL expose no endpoint that lets a caller query
tables directly.

The absence of those policies SHALL be recorded in the project's documentation
as a known difference between backends rather than left for someone to discover
by reading the schema.

#### Scenario: No public data endpoint exists

- **WHEN** a deployment runs on a backend without a public data API
- **THEN** no request from a browser can query a table directly
- **AND** every database read and write goes through the server's own routes

#### Scenario: Database credentials stay on the server

- **WHEN** any page of the storefront is served
- **THEN** no database connection string or credential appears in what is sent to the browser

### Requirement: Generated database types name their source

The generated type definitions the server compiles against SHALL be producible
from either backend, and the process SHALL name which database a given
generation read. A type file generated from one shop's database SHALL NOT be
assumed to describe another's.

Where the two backends hold the same schema, the generated types SHALL be
equivalent, and a difference between them SHALL be treated as a schema drift to
investigate rather than a formatting difference to ignore.

#### Scenario: Types generated from either backend

- **WHEN** types are generated from a Supabase project and from a Postgres host holding the same schema
- **THEN** both runs succeed
- **AND** the results describe the same tables, columns, types and nullability

#### Scenario: Generation against a database that has drifted

- **WHEN** generated types differ from the committed ones
- **THEN** the difference is reported rather than silently written over
