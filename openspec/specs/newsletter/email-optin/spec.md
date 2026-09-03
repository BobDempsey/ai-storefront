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
welcome email containing a promo code. The code SHALL be the shop's currently
active code, read at send time from the same place the checkout reads it, so the
code a subscriber is given is always one the checkout will accept. It is the
same code sent to every subscriber in this capability, not a code generated per
subscriber.

#### Scenario: New subscription triggers the welcome email

- **WHEN** a visitor subscribes with an email address that was not
  previously on the mailing list
- **THEN** an email is sent to that address containing the shop's active promo
  code

#### Scenario: The active code changed since the last send

- **WHEN** staff change which code is active and a visitor then subscribes
- **THEN** the welcome email carries the new code

#### Scenario: No code is active

- **WHEN** a visitor subscribes while no code is active
- **THEN** they are still recorded as subscribed
- **AND** the welcome email is sent without a code rather than with a code the
  checkout would refuse

#### Scenario: Welcome email cannot be sent

- **WHEN** a new subscription is recorded but the welcome email fails to send
- **THEN** the visitor is told their subscription could not be completed
- **AND** the failure is logged on the server rather than shown to the
  visitor

### Requirement: The opt-in offer states what the subscriber gets

Wherever the storefront invites a visitor to join the mailing list, it SHALL
state the discount a subscriber receives and that it applies to one order. The
figure shown SHALL be the active code's percentage rather than a fixed number
written into the page, so the offer can never promise a discount the checkout
would not give.

#### Scenario: The offer names the current discount

- **WHEN** a visitor sees the opt-in invitation while a 25% code is active
- **THEN** the invitation says the subscriber gets 25% off their first order

#### Scenario: Staff change the discount

- **WHEN** staff change the active code's percentage to 10%
- **THEN** the invitation says 10% without a deploy

#### Scenario: No code is active

- **WHEN** no code is active
- **THEN** the invitation still invites the visitor to subscribe, without naming
  a discount

### Requirement: A visitor can opt in while using another form

The contact form and the checkout form SHALL each offer to add the visitor to
the mailing list, using the email address that form already collects rather than
asking for it a second time. The offer SHALL be off by default and SHALL require
a deliberate act to accept.

#### Scenario: Opting in from the contact form

- **WHEN** a visitor ticks the opt-in box and sends a contact message
- **THEN** the address they gave on that form is added to the mailing list
- **AND** they receive the welcome email

#### Scenario: Opting in at checkout

- **WHEN** a buyer ticks the opt-in box and places an order
- **THEN** the address they gave for the order is added to the mailing list

#### Scenario: The box is left alone

- **WHEN** a visitor submits either form without ticking the box
- **THEN** their address is not added to the mailing list

#### Scenario: An address that already subscribed

- **WHEN** a visitor ticks the box with an address already on the list
- **THEN** no second record is created and no second welcome email is sent
- **AND** their message or order is unaffected

### Requirement: A failed subscription never fails the form it rode in on

Subscribing from the contact or checkout form SHALL be secondary to that form's
own purpose. Where the subscription cannot be recorded or its welcome email
cannot be sent, the contact message SHALL still be delivered and the order SHALL
still be placed, and the failure SHALL be logged on the server.

#### Scenario: Subscription fails during checkout

- **WHEN** a buyer ticks the box and the subscription cannot be recorded
- **THEN** the order is still placed and the buyer is told it was
- **AND** the failure is logged on the server

#### Scenario: Subscription fails while sending a contact message

- **WHEN** a visitor ticks the box and the subscription fails
- **THEN** the contact message is still delivered
- **AND** the sender is still told the message was sent

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
