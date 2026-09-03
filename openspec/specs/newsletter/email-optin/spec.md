# newsletter/email-optin Specification

## Purpose
Defines how a visitor joins the shop's mailing list from the storefront by
submitting an email address, and what they receive in return: confirmation
that they're subscribed, and a one-time welcome promo code by email.

## Requirements

### Requirement: A visitor can opt in from the storefront

The storefront SHALL provide a way for any visitor, without an account, to
submit an email address to join the mailing list. The control SHALL be
reachable from the site chrome on every page that uses the default layout.

#### Scenario: Visitor submits a valid, new email address

- **WHEN** a visitor enters a syntactically valid email address that has not
  subscribed before and submits it
- **THEN** the address is recorded as subscribed
- **AND** the visitor is told they are subscribed

#### Scenario: Visitor submits an invalid address

- **WHEN** a visitor submits text that is not a syntactically valid email
  address
- **THEN** the submission is rejected
- **AND** the visitor is told to check the address, without a request
  reaching storage or triggering an email send

### Requirement: An address can only subscribe once

The storefront SHALL treat an email address already on the mailing list as
already subscribed, and SHALL NOT create a second record for it or send a
second welcome email for it.

#### Scenario: Visitor submits an address that already subscribed

- **WHEN** a visitor submits an email address that is already on the mailing
  list
- **THEN** no second subscriber record is created
- **AND** no second welcome email is sent
- **AND** the visitor is told they are subscribed, worded identically to a
  first-time subscription, so the response never reveals whether the address
  was already on the list

### Requirement: A new subscriber receives a welcome promo code by email

When a new subscription is recorded, the storefront SHALL send the address a
welcome email containing a promo code. The code SHALL be the single value
configured for the storefront; it is the same code sent to every subscriber
in this capability, not a code generated per subscriber.

#### Scenario: New subscription triggers the welcome email

- **WHEN** a visitor subscribes with an email address that was not
  previously on the mailing list
- **THEN** an email is sent to that address containing the configured promo
  code

#### Scenario: Welcome email cannot be sent

- **WHEN** a new subscription is recorded but the welcome email fails to send
- **THEN** the visitor is told their subscription could not be completed
- **AND** the failure is logged on the server rather than shown to the
  visitor

### Requirement: The opt-in route is rate-limited per origin

The storefront SHALL limit how many opt-in submissions a single origin can
make in a given window, tracked independently of the limits on other routes
(such as contact or checkout), so opt-in abuse cannot exhaust the allowance
another route needs.

#### Scenario: Origin exceeds the opt-in submission limit

- **WHEN** a single origin submits more opt-in requests than the configured
  limit within the configured window
- **THEN** further submissions from that origin are rejected until the
  window passes
- **AND** the visitor is told to try again later
