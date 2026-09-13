## Purpose

Lets a visitor who wants something the catalogue does not stock ask for it,
rather than leaving on an empty search, and delivers that request to staff with
enough context to answer it.

## ADDED Requirements

### Requirement: A visitor who finds nothing is offered a way to ask

Where a visitor's search matches nothing in the catalogue, the storefront SHALL
offer them a way to ask staff for what they were looking for, alongside the
existing offer to clear the search.

The offer SHALL carry the term they searched for into the request, so a visitor
does not type it twice and staff can see what the shop failed to answer.

The offer SHALL NOT claim the shop can make the thing. It asks; staff answer.

#### Scenario: A search that matches nothing

- **WHEN** a visitor searches for something the catalogue does not carry
- **THEN** they are told nothing matched, offered a way to clear the search, and offered a way to ask staff about it

#### Scenario: The term travels with the request

- **WHEN** a visitor takes up that offer
- **THEN** the request form already holds the term they searched for
- **AND** they can edit it before sending

#### Scenario: A search that matches something

- **WHEN** a visitor's search matches at least one item
- **THEN** no custom-order offer is shown, because the shop answered them

### Requirement: A custom-order request reaches staff as a request, not an order

A custom-order request SHALL be delivered to staff by the same path an ordinary
contact message takes. It SHALL NOT create an order, a cart, a line item or a
promo redemption, and it SHALL NOT quote or imply a price.

The delivered message SHALL be distinguishable from an ordinary contact message,
so staff can tell a request for work from a question about an existing order.

A failed delivery SHALL be reported to the visitor, because nothing is stored:
a request that silently vanishes is worse than one that visibly failed.

#### Scenario: A request is sent

- **WHEN** a visitor sends a custom-order request
- **THEN** staff receive it, marked as a custom-order request
- **AND** no order is created

#### Scenario: Delivery fails

- **WHEN** the request cannot be delivered
- **THEN** the visitor is told it failed and invited to try again

#### Scenario: A request quotes no price

- **WHEN** a visitor sends a custom-order request
- **THEN** neither the storefront nor the message states a price or a commitment to make the item

### Requirement: The assistant points at the request rather than answering for the shop

Where a visitor asks the shopping assistant for something the catalogue does not
carry, the assistant SHALL tell them the shop does not stock it and SHALL point
them at the custom-order request.

The assistant SHALL NOT gain a tool that sends a request, quotes a price, or
commits the shop to making anything. It names where to ask; the visitor asks.

#### Scenario: A visitor asks the assistant for something not stocked

- **WHEN** a visitor asks the assistant for an item the catalogue does not carry
- **THEN** it says the shop does not stock it and points them at the custom-order request

#### Scenario: The assistant is asked to place the request

- **WHEN** a visitor asks the assistant to send the request for them
- **THEN** it explains that they send it themselves, and does not send anything
