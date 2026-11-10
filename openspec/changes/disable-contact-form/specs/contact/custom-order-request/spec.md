# Spec Delta

## REMOVED Requirements

### Requirement: A visitor who finds nothing is offered a way to ask

**Reason**: The offer led to the contact form, which is being removed. An offer that opens a 404 is worse than no offer.
**Migration**: An empty search still tells the visitor nothing matched and still offers to clear the search. The searched term is no longer carried anywhere.

### Requirement: A custom-order request reaches staff as a request, not an order

**Reason**: A custom-order request rode the contact route. Removing the route removes the request with it, and leaving the route in place for this one case would leave the spam hole open.
**Migration**: None. No custom-order request is delivered, and none was ever stored, so nothing is in flight to drain.

## MODIFIED Requirements

### Requirement: The assistant points at the request rather than answering for the shop

Where a visitor asks the shopping assistant for something the catalogue does not
carry, the assistant SHALL tell them the shop does not stock it.

The assistant SHALL NOT point at a contact page, a request form or any other
route for asking staff, because the storefront no longer offers one. It SHALL
NOT gain a tool that sends a request, quotes a price, or commits the shop to
making anything.

#### Scenario: A visitor asks the assistant for something not stocked

- **WHEN** a visitor asks the assistant for an item the catalogue does not carry
- **THEN** it says the shop does not stock it
- **AND** it does not name a page or form for asking staff about it

#### Scenario: The assistant is asked to place the request

- **WHEN** a visitor asks the assistant to request the item on their behalf
- **THEN** it explains that it cannot, and does not send anything

#### Scenario: The assistant is asked what the item would cost

- **WHEN** a visitor asks the assistant to price an item the shop does not stock
- **THEN** it does not quote a price or agree that the shop will make it
