# Spec Delta

## REMOVED Requirements

### Requirement: A visitor can opt in while using another form

**Reason**: The requirement covered two host forms, and one of them is being removed. Checkout is the only form left that collects an address, so the requirement is replaced by one that says so rather than edited to describe a set of one.
**Migration**: Replaced by "A visitor can opt in while checking out" below. Checkout behaviour is unchanged.

### Requirement: A failed subscription never fails the form it rode in on

**Reason**: Same reason. With the contact form gone, the only form a subscription rides in on is checkout.
**Migration**: Replaced by "A failed subscription never fails the checkout it rode in on" below. Checkout behaviour is unchanged.

## ADDED Requirements

### Requirement: A visitor can opt in while checking out

The checkout form SHALL offer to add the visitor to the mailing list, using the
email address that form already collects rather than asking for it a second
time. The offer SHALL be off by default and SHALL require a deliberate act to
accept.

#### Scenario: Opting in at checkout

- **WHEN** a buyer ticks the opt-in box and places an order
- **THEN** the address they gave for the order is added to the mailing list

#### Scenario: The box is left alone

- **WHEN** a buyer submits the form without ticking the box
- **THEN** their address is not added to the mailing list

#### Scenario: An address that already subscribed

- **WHEN** a buyer ticks the box with an address already on the list
- **THEN** no second record is created and no second welcome email is sent
- **AND** their order is unaffected

### Requirement: A failed subscription never fails the checkout it rode in on

Subscribing from the checkout form SHALL be secondary to that form's own
purpose. Where the subscription cannot be recorded or its welcome email cannot
be sent, the order SHALL still be placed, and the failure SHALL be logged on the
server.

#### Scenario: Subscription fails during checkout

- **WHEN** a buyer ticks the box and the subscription cannot be recorded
- **THEN** the order is still placed and the buyer is told it was
- **AND** the failure is logged on the server

## MODIFIED Requirements

### Requirement: The opt-in route is rate-limited per origin

The storefront SHALL limit how many opt-in submissions a single origin can
make in a given window, tracked independently of the limits on other routes
(such as checkout), so opt-in abuse cannot exhaust the allowance another route
needs.

#### Scenario: Origin exceeds the opt-in submission limit

- **WHEN** a single origin submits more opt-in requests than the configured
  limit within the configured window
- **THEN** further submissions from that origin are rejected until the
  window passes
- **AND** the visitor is told to try again later
