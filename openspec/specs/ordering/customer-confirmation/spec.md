# ordering/customer-confirmation Specification

## Purpose

Defines what a buyer is told by email once their order request is committed:
what they asked for, what it costs, that no payment has been taken, and who
will contact them. It also fixes the guarantee that sending this cannot change
whether the order exists or whether staff hear about it.

## Requirements

### Requirement: A committed order confirms itself to the buyer

When an order is committed, the system SHALL send a confirmation email to the
email address recorded on that order. The confirmation SHALL state the order's
identifier, so the buyer and staff can refer to the same order later.

The confirmation SHALL be sent in addition to the staff notification, never
instead of it.

#### Scenario: An order is placed

- **WHEN** an order is committed for a buyer who gave an email address
- **THEN** a confirmation is sent to that address
- **AND** it states the order's identifier
- **AND** the staff notification is still sent

#### Scenario: Email is not configured

- **WHEN** an order is committed on a deployment with no email credentials
- **THEN** no confirmation is attempted
- **AND** the order is still committed and still reported as placed

### Requirement: The confirmation states what was ordered and what it costs

The confirmation SHALL state each line of the order as the system priced it,
with the quantity and the amount for that line, and the order's total. These
SHALL be the figures recorded on the committed order, not figures supplied by
the buyer's browser.

Where the order was discounted, the confirmation SHALL also state the total
before the discount and the discount that applied, so the buyer sees the same
three figures staff do. Where it was not, the confirmation SHALL state the
total alone and SHALL NOT show an empty or zero discount.

#### Scenario: An undiscounted order

- **WHEN** a buyer receives the confirmation for an order priced at catalogue prices
- **THEN** it lists each item with its quantity and amount
- **AND** it states the total
- **AND** it shows no discount line and no pre-discount total

#### Scenario: A discounted order

- **WHEN** a buyer receives the confirmation for an order that was discounted
- **THEN** it states the total before the discount, the discount, and the total charged
- **AND** the three are consistent with each other

#### Scenario: The order could not be read back

- **WHEN** the committed order cannot be re-read to build the confirmation
- **THEN** no confirmation is sent
- **AND** the order is still committed and still reported as placed

### Requirement: The confirmation says no payment has been taken

This storefront takes an order request, not a payment. The confirmation SHALL
state that no payment has been taken and that staff will make contact to
arrange it, so a buyer cannot read a total as a receipt for money already paid.

The confirmation SHALL direct a reply to the shop rather than to an unattended
address, so a buyer answering the email reaches staff.

#### Scenario: A buyer reads the confirmation

- **WHEN** a buyer receives the confirmation
- **THEN** it states that no payment has been taken
- **AND** it states that staff will contact them to arrange payment

#### Scenario: A buyer replies to the confirmation

- **WHEN** a buyer replies to the confirmation
- **THEN** the reply is addressed to the shop's own contact address

### Requirement: An ordered file is promised, not delivered

A downloadable file is sold through the same order path as a physical item, and
staff send it by hand after payment. Where an order contains a file, the
confirmation SHALL say the file will be emailed once payment is arranged.

The confirmation SHALL NOT carry the file as an attachment and SHALL NOT carry
a link purporting to download it.

#### Scenario: An order containing a file

- **WHEN** a buyer receives the confirmation for an order containing a file
- **THEN** it says the file is emailed once payment is arranged
- **AND** it carries no attachment and no download link

#### Scenario: An order of physical goods only

- **WHEN** a buyer receives the confirmation for an order with no file in it
- **THEN** it says nothing about files

### Requirement: Values interpolated into the confirmation are escaped

The confirmation is HTML and quotes values a buyer submitted through a public,
unauthenticated form, along with product names and a promo code. Every value
interpolated into it SHALL be escaped so it renders as text in the buyer's
inbox and cannot introduce markup.

#### Scenario: A submitted value containing markup characters

- **WHEN** a confirmation quotes a value whose text contains HTML characters
- **THEN** those characters render as text in the inbox
- **AND** no markup is introduced into the email

### Requirement: Confirming the buyer cannot fail the order or the staff notification

The committed order is the real record and the staff notification is how the
shop learns of it. A failure to send the confirmation, of any kind, SHALL be
recorded in the server log and SHALL NOT be reported to the buyer as a failed
order, SHALL NOT prevent the staff notification from being sent, and SHALL NOT
change what the storefront reports about the order.

#### Scenario: The confirmation fails to send

- **WHEN** sending the confirmation fails or is rejected
- **THEN** the failure is logged
- **AND** the order is reported to the buyer as placed
- **AND** the staff notification is still sent

#### Scenario: The staff notification fails to send

- **WHEN** sending the staff notification fails
- **THEN** the confirmation is still sent to the buyer

### Requirement: A test order confirms nothing to anyone

When a committed order carries the test marker, the system SHALL NOT send the
buyer confirmation for it, for the same reason it sends no staff notification:
a test run must not put mail about orders nobody placed into a real inbox.

Withholding it SHALL NOT be reported as a delivery failure.

#### Scenario: A test order is placed

- **WHEN** an order carrying the test marker is committed
- **THEN** no confirmation is sent
- **AND** no staff notification is sent
- **AND** the response reports the order as placed, with no email failure

#### Scenario: A real order is unaffected

- **WHEN** an order without the test marker is committed
- **THEN** the confirmation and the staff notification are both sent
