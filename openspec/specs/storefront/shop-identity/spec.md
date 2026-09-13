# storefront/shop-identity Specification

## Purpose

Defines what makes one deployment of this template a distinct shop, so that
standing up another one is a checklist rather than an act of memory, and so a
shop that is misconfigured says so rather than leaving a customer to find out.

## Requirements

### Requirement: A deployment is one shop, and says which

Every deployment SHALL present exactly one shop identity: a name a customer
reads, an origin its own links are built against, and one database it reads and
writes. These SHALL come from the deployment's own configuration rather than
from anything in the code, so two shops can run the same build.

A deployment SHALL NOT read or write another shop's data. In particular an order
placed on one shop SHALL NOT appear in another shop's orders, and a subscriber
added on one SHALL NOT appear on another.

Where a shop's name is not configured, the storefront SHALL still serve, showing
a neutral placeholder rather than another shop's name.

#### Scenario: Two shops running the same build

- **WHEN** two deployments of the same build are configured with different shop identities
- **THEN** each shows its own name, and each reads and writes only its own database

#### Scenario: An order stays in its own shop

- **WHEN** an order is placed on one shop
- **THEN** it appears in that shop's orders
- **AND** it does not appear in the other shop's orders

#### Scenario: A shop with no name configured

- **WHEN** the shop name is not configured
- **THEN** the storefront serves, showing a placeholder name rather than failing or borrowing another shop's

### Requirement: A shop's link previews carry its own name

A shop SHALL present link-preview information describing itself: its own name,
its own description and a share image bearing its own name and no other shop's.

Where a shop has no share image of its own, it SHALL omit the image rather than
serve another shop's, because a preview showing the wrong shop's name is worse
than one showing no picture.

#### Scenario: A link to the second shop

- **WHEN** a link to a shop is shared
- **THEN** the preview shows that shop's name and a share image bearing it

#### Scenario: A shop with no share image

- **WHEN** a shop has no share image configured
- **THEN** its previews carry no image, rather than another shop's

### Requirement: A shop is verifiable from outside before it takes orders

It SHALL be possible to check any deployment of this template from outside,
without editing the check, by naming the deployment to verify. The check SHALL
confirm that the shop serves its catalogue, reports its own name, and is not
marked as a non-production deployment.

A check that names no deployment SHALL still run, against a documented default,
so an adopter who has read nothing gets a working command.

#### Scenario: Checking either shop

- **WHEN** the check is pointed at either shop's address
- **THEN** it verifies that deployment, and its result describes that shop

#### Scenario: A shop that is still misconfigured

- **WHEN** a deployment serves a placeholder name or an error page
- **THEN** the check fails and names what is wrong

### Requirement: One shop's failure does not reach the other

The shops SHALL share no runtime state. An outage, a schema change, an exhausted
quota or a rate-limit allowance on one SHALL have no effect on the other.

#### Scenario: One shop's database is unavailable

- **WHEN** one shop's database cannot be reached
- **THEN** the other shop continues to serve its catalogue and accept orders

#### Scenario: One shop exhausts a caller's rate-limit allowance

- **WHEN** a caller exhausts the order allowance on one shop
- **THEN** the same caller is not limited on the other
