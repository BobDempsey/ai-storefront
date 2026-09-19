# Spec Delta

## Purpose

Defines what must survive when a shop's database moves from one host to another,
and what must remain true of the host it left, so that a move is reversible and
a shop's history is never the thing that pays for it.

## ADDED Requirements

### Requirement: A shop's records survive a move of their host

Where a shop's database moves to a different host, every row the shop holds
SHALL arrive intact: orders, the lines they contain, promo redemptions and
newsletter subscribers. Identifiers SHALL be preserved, so that an order id a
staff member holds from an email still finds the same order after the move.

Timestamps SHALL be preserved as recorded rather than reset to the time of the
migration, because the order history is a record of when the shop did things.

A move SHALL NOT be treated as complete until the row counts and the contents of
each table on the new host have been compared against the old one and found to
match.

#### Scenario: An order placed before the move

- **WHEN** an order recorded before the move is looked up on the new host by its id
- **THEN** it is found, with the same lines, the same totals and the same recorded time

#### Scenario: Counts are compared before the move is called done

- **WHEN** the migration has run
- **THEN** each table's row count on the new host is compared against the old host's
- **AND** a mismatch stops the move rather than being noted and passed over

#### Scenario: A subscriber does not receive a second welcome

- **WHEN** an address that subscribed before the move is subscribed again after it
- **THEN** it is recognised as already subscribed, as it would have been before

### Requirement: The host a shop left stays a working rollback

After a move, the previous host SHALL be left holding the shop's schema and its
data, unaltered, until someone decides deliberately to release it. Returning the
shop to it SHALL require changing configuration and redeploying, and SHALL NOT
require restoring a backup or replaying a migration.

A shop SHALL NOT write to both hosts at once. Once the move is made, the
previous host stops receiving writes, so the two copies diverge from that moment
and the rollback is understood to lose anything recorded after it.

#### Scenario: Rolling back after the move

- **WHEN** the shop's configuration is pointed back at the previous host and redeployed
- **THEN** the storefront serves from that host, with the data it held at the moment of the move

#### Scenario: Writes after the move

- **WHEN** an order is placed after the move
- **THEN** it is recorded on the new host only
- **AND** the previous host is unchanged

### Requirement: A move is verified against the live shop, not only its tests

A move SHALL NOT be called done on a passing test suite alone. The live shop
SHALL be confirmed to serve its own catalogue from the new host, to accept a real
order that is then found on the new host and absent from the old one, and to send
the staff notification that order triggers.

Where two hosts hold the same catalogue, the check SHALL distinguish them by
something that differs between the two copies rather than by content they share,
because identical data proves nothing about which host answered.

#### Scenario: The live shop is serving the new host

- **WHEN** the live shop's catalogue is fetched after the move
- **THEN** the rows it returns are identifiably the new host's

#### Scenario: A real order after the move

- **WHEN** an order is placed on the live shop after the move
- **THEN** it is found on the new host, is absent from the previous one, and its staff notification is delivered
