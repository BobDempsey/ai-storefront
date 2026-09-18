# Spec Delta

## MODIFIED Requirements

### Requirement: A deployment is one shop, and says which

Every deployment SHALL present exactly one shop identity: a name a customer
reads, an origin its own links are built against, and one database it reads and
writes. These SHALL come from the deployment's own configuration rather than
from anything in the code, so that a shop's identity is never a code change.

Two shops MAY run the same build, and MAY run different ones. A shop that
diverges from the template SHALL remain a distinct shop by the same rules: its
identity still comes from its configuration, and nothing about how its code is
kept SHALL change what this requirement demands of it.

Two shops MAY hold their databases on different hosts, and one shop's identity
SHALL NOT depend on which host another uses. Everything this requirement demands
SHALL hold whether the two shops' databases sit on the same provider or on
different ones.

A deployment SHALL NOT read or write another shop's data. In particular an order
placed on one shop SHALL NOT appear in another shop's orders, and a subscriber
added on one SHALL NOT appear on another. This SHALL hold whether or not the two
shops share a build, and whether or not they share a database host.

Where a shop's name is not configured, the storefront SHALL still serve, showing
a neutral placeholder rather than another shop's name.

#### Scenario: Two shops running the same build

- **WHEN** two deployments of the same build are configured with different shop identities
- **THEN** each shows its own name, and each reads and writes only its own database

#### Scenario: Two shops whose code has diverged

- **WHEN** one shop's code has diverged from the other's
- **THEN** each still shows its own name and reads and writes only its own database
- **AND** neither shop's deployment is affected by a change made only to the other's code

#### Scenario: Two shops on different database hosts

- **WHEN** one shop's database is on one provider and the other's is on a different provider
- **THEN** each shows its own name and serves its own catalogue
- **AND** neither shop's orders or subscribers appear on the other

#### Scenario: An order stays in its own shop

- **WHEN** an order is placed on one shop
- **THEN** it appears in that shop's orders
- **AND** it does not appear in the other shop's orders

#### Scenario: A shop with no name configured

- **WHEN** the shop name is not configured
- **THEN** the storefront serves, showing a placeholder name rather than failing or borrowing another shop's
