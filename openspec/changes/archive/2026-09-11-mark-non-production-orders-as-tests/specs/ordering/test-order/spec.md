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
environment other than the live shop, every order it commits SHALL be recorded
as a test, with no header and nothing asked of the caller. The environment SHALL
be read from the server's own configuration, never from anything the request
carries, so a browser cannot claim to be a preview.

Neither case SHALL cause a request to be refused. A caller that asks for a test
order and is entitled to neither gets an ordinary order.

The live shop SHALL be unable to produce a test order by deployment, because it
names no environment. It remains able to produce one by secret, and that path
SHALL behave identically in every environment, so a suite run against a
production build exercises what production runs.

#### Scenario: A request presenting the correct secret

- **WHEN** an order request presents the server's test secret and asks for a test order
- **THEN** the committed order records that it is a test

#### Scenario: A request with a wrong or missing secret

- **WHEN** an order request on the live shop asks for a test order without the secret, or with the wrong one
- **THEN** the committed order records that it is not a test
- **AND** the request is not rejected: it is an ordinary order

#### Scenario: No secret configured

- **WHEN** the live shop holds no test secret and a request asks for a test order
- **THEN** the committed order records that it is not a test

#### Scenario: An order placed on a development server

- **WHEN** an order is placed on a storefront configured as a development environment, with no secret presented
- **THEN** the committed order records that it is a test
- **AND** no staff notification is sent

#### Scenario: An order placed on a preview deployment

- **WHEN** an order is placed on a storefront configured as a preview environment
- **THEN** the committed order records that it is a test

#### Scenario: A browser claiming to be a preview

- **WHEN** an order request carries a header or body naming a non-production environment, on the live shop
- **THEN** it is ignored and the committed order records that it is not a test

### Requirement: A test order does not spend the customer rate-limit allowance

A request that presents the server's test secret SHALL NOT count against the
per-caller order rate limit, and SHALL NOT be refused by it. Every request that
does not present the secret SHALL be limited exactly as before, **including one
that is recorded as a test because of the deployment it was placed on**.

Automated runs share one address with real traffic on the same machine, so a
suite that spent the allowance would fail on its own second run rather than on
anything about the code. That reasoning covers the secret and does not extend to
a person clicking through a dev server, who should meet the same limiter a
customer does, where a fault in it is easy to notice.

#### Scenario: A suite places more orders than the limit allows

- **WHEN** more orders than the limit are placed in the window, all presenting the secret
- **THEN** every one of them is accepted

#### Scenario: An ordinary caller is still limited

- **WHEN** a caller without the secret exceeds the limit in the window
- **THEN** the request is refused, as it was before

#### Scenario: A development server without the secret

- **WHEN** more orders than the limit are placed on a development server without the secret
- **THEN** the limiter refuses them exactly as it would on the live shop
