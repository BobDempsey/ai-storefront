## MODIFIED Requirements

### Requirement: Only a caller holding the server's test secret may declare a test order

An order SHALL be recorded as a test in either of two cases, and in no others.

The first is the secret. The order API SHALL treat a request as a test order
when it presents the secret the server holds for that purpose. A request without
it, or with a wrong one, SHALL NOT become a test order on that basis, whatever
the request claims. The secret SHALL NOT be sent to the browser. When no secret
is configured on the server, no request SHALL be able to declare a test order by
presenting one.

The second is the deployment. Where the storefront is configured as an
environment other than a live shop, every order it commits SHALL be recorded
as a test, with no header and nothing asked of the caller. The environment SHALL
be read from the server's own configuration, never from anything the request
carries, so a browser cannot claim to be a preview.

**Each deployment SHALL judge itself.** More than one deployment may be a live
shop at the same time, so being live SHALL NOT mean being the only one, and a
deployment SHALL NOT consult, or be affected by, how another deployment is
configured. A preview of one shop SHALL commit test orders while the other
shop's production deployment continues to commit real ones.

Neither case SHALL cause a request to be refused. A caller that asks for a test
order and is entitled to neither gets an ordinary order.

A live shop SHALL be unable to produce a test order by deployment, because it
names no environment. It remains able to produce one by secret, and that path
SHALL behave identically in every environment, so a suite run against a
production build exercises what production runs.

#### Scenario: A request presenting the correct secret

- **WHEN** an order request presents the server's test secret and asks for a test order
- **THEN** the committed order records that it is a test

#### Scenario: A request with a wrong or missing secret

- **WHEN** an order request on a live shop asks for a test order without the secret, or with the wrong one
- **THEN** the committed order records that it is not a test
- **AND** the request is not rejected: it is an ordinary order

#### Scenario: No secret configured

- **WHEN** a live shop holds no test secret and a request asks for a test order
- **THEN** the committed order records that it is not a test

#### Scenario: An order placed on a development server

- **WHEN** an order is placed on a storefront configured as a development environment, with no secret presented
- **THEN** the committed order records that it is a test
- **AND** no staff notification is sent

#### Scenario: An order placed on a preview deployment

- **WHEN** an order is placed on a storefront configured as a preview environment
- **THEN** the committed order records that it is a test

#### Scenario: A browser claiming to be a preview

- **WHEN** an order request carries a header or body naming a non-production environment, on a live shop
- **THEN** it is ignored and the committed order records that it is not a test

#### Scenario: Two live shops, one of them with a preview

- **WHEN** an order is placed on one shop's preview deployment
- **THEN** it is recorded as a test in that shop's own orders
- **AND** orders placed on the other shop's live deployment are still recorded as real
