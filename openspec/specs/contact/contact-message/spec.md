## Purpose

Defines how a visitor sends a message to the shop from the storefront — what
the form accepts, how the message reaches staff, how the storefront protects
that route from abuse, and what the sender is told about the outcome.

## Requirements

### Requirement: A visitor can send a message from the storefront

The storefront SHALL provide a page where any visitor, without an account, can
send the shop a message consisting of their name, their email address and the
message text. The route to it SHALL be reachable from the site chrome on every
page that uses the default layout.

#### Scenario: Visitor sends a message

- **WHEN** a visitor completes the contact form with a name, a valid email address and a message, and submits it
- **THEN** the message is delivered to the shop's staff address
- **AND** the sender is told the message was sent

#### Scenario: Reaching the form

- **WHEN** a visitor is on any page using the default layout
- **THEN** a control leading to the contact page is present, labelled for assistive technology

### Requirement: The shop's address is not published in the page

The storefront SHALL NOT render the shop's contact address into any page it
serves, and SHALL NOT expose it to client-side code. Contact SHALL be routed
through the form instead.

#### Scenario: Inspecting the delivered page

- **WHEN** the HTML or client bundle of any storefront page is inspected
- **THEN** it contains no staff or shop email address

### Requirement: Submissions are validated before anything is sent

A submission SHALL be accepted only when it carries a name, an email address of
valid form, and non-empty message text, each within a bounded length. An
invalid submission SHALL be rejected with a message telling the sender to check
the form, and SHALL cause no email to be sent.

#### Scenario: Missing message text

- **WHEN** a submission arrives with an empty message
- **THEN** it is rejected
- **AND** no email is sent

#### Scenario: Oversized submission

- **WHEN** a submission exceeds the accepted length for any field
- **THEN** it is rejected
- **AND** no email is sent

### Requirement: Sender-supplied text cannot inject markup into the staff inbox

Every value taken from the submission and placed into the staff email SHALL be
escaped, so markup in a submission is delivered as visible text and never as
live markup. Line breaks in the message SHALL be preserved in the delivered
email.

#### Scenario: A submission containing markup

- **WHEN** a message contains HTML tags or an ampersand
- **THEN** the staff email shows them as literal text
- **AND** no element from the submission is rendered as markup

#### Scenario: A multi-line message

- **WHEN** a message contains several lines
- **THEN** the delivered email preserves those line breaks

### Requirement: Staff can reply directly to the sender

The email delivered to staff SHALL identify the sender and SHALL be composed so
that replying to it reaches the sender's address rather than the storefront.

#### Scenario: Staff reply

- **WHEN** a member of staff replies to a contact email
- **THEN** the reply is addressed to the email address the sender gave

### Requirement: The contact route is rate limited

The storefront SHALL limit how many messages one origin can send in a period,
and SHALL refuse further submissions from that origin with a message inviting
them to try again later. The limit SHALL be independent of the order route's
limit, so exhausting one does not block the other.

#### Scenario: Too many messages from one origin

- **WHEN** an origin submits more messages within the period than the limit allows
- **THEN** the further submissions are refused
- **AND** the sender is told to try again later

#### Scenario: Contact traffic does not block ordering

- **WHEN** an origin has exhausted the contact limit
- **THEN** that origin can still submit an order

### Requirement: The sender is told whether the message actually went

Because a contact message is not stored, the sender SHALL be told the message
was sent only when the delivery was accepted. Where delivery fails, or where
email is not configured, the sender SHALL be told the message could not be sent
and invited to try again, and the failure SHALL be logged on the server.

#### Scenario: Delivery fails

- **WHEN** the email cannot be delivered
- **THEN** the sender is told the message was not sent and can try again
- **AND** the sender is not shown a confirmation
- **AND** the failure is logged on the server

#### Scenario: Email is not configured

- **WHEN** no email credentials are configured and a message is submitted
- **THEN** the sender is told the message could not be sent
- **AND** the storefront does not report success

#### Scenario: The form after a successful send

- **WHEN** a message has been sent successfully
- **THEN** the sender sees a confirmation in place of the form's previous state
