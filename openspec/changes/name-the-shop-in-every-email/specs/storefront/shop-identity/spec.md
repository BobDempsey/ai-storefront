## ADDED Requirements

### Requirement: A shop's outgoing mail says which shop sent it

Every email a shop sends SHALL identify that shop by the same name the
storefront displays to customers, taken from the deployment's own configuration.
This SHALL hold for mail to staff and mail to customers alike.

The name SHALL appear in the subject, because an inbox is sorted and searched on
subjects, and a staff member reading a list of notifications from several shops
has nothing else to go on.

Where a shop's name is not configured, the mail SHALL still be sent. An unset
variable SHALL NOT be a reason for an order notification or a buyer's
confirmation to fail, because the order is already committed by then and the
mail is the only thing telling anybody about it.

#### Scenario: A staff notification from one of several shops

- **WHEN** an order is placed on a shop
- **THEN** the staff notification's subject names that shop
- **AND** a notification from another shop names that other shop instead

#### Scenario: A buyer's confirmation

- **WHEN** a buyer is sent their own copy of an order
- **THEN** it names the shop they bought from

#### Scenario: A message that is not an order

- **WHEN** a contact message, a custom-order request or a newsletter welcome is sent
- **THEN** it names the shop it came from, as an order notification does

#### Scenario: A shop with no name configured

- **WHEN** a shop that has no configured name sends any of these emails
- **THEN** the email is still sent and still delivered
- **AND** it reads sensibly rather than naming an empty shop
