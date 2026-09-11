## Purpose

Defines what the storefront's chat assistant may do for a visitor, what it must
never do, how a cart change it proposes reaches the cart, and what has to be
true before an order it drafted is submitted.

## Requirements

### Requirement: The assistant is reachable from every page

The storefront SHALL offer a control in the site chrome that opens a chat panel,
on every page that uses the default layout. Opening or closing the panel SHALL
NOT navigate the visitor away from the page they are on, and SHALL NOT discard
their cart.

#### Scenario: Opening the panel mid-browse

- **WHEN** a visitor on a product page opens the chat panel
- **THEN** the panel opens over the page
- **AND** the page beneath it is unchanged

#### Scenario: Closing the panel

- **WHEN** a visitor closes the panel
- **THEN** they remain on the same page with their cart intact

### Requirement: The assistant answers about this shop and declines the rest

The assistant SHALL answer questions about the catalogue, an item's details, the
visitor's cart, and how ordering works. Asked about anything else, it SHALL
decline briefly in the panel and remain available for the next question. A
decline SHALL NOT navigate the visitor anywhere.

#### Scenario: A question about the catalogue

- **WHEN** a visitor asks which items are made of PETG
- **THEN** the assistant answers from the catalogue

#### Scenario: A question about something else

- **WHEN** a visitor asks the assistant to write a poem or explain a news story
- **THEN** it declines in a sentence and offers to help with the shop instead
- **AND** the visitor can carry on asking shop questions in the same conversation

### Requirement: Every fact about an item comes from the catalogue

The assistant SHALL take an item's name, description, price, availability and
file details from the catalogue, and SHALL NOT state a price, a total or an
item that it was not given. Where a figure is shown to the visitor, it SHALL be
the figure the storefront itself would show.

#### Scenario: Asked for a price

- **WHEN** a visitor asks what the dice tower costs
- **THEN** the price shown is the catalogue price for that item

#### Scenario: Asked for something the shop does not sell

- **WHEN** a visitor asks for an item that is not in the catalogue
- **THEN** the assistant says the shop does not have it
- **AND** it does not invent a name, a price or a delivery date

#### Scenario: Asked for a cart total

- **WHEN** a visitor asks what their cart comes to
- **THEN** the total is the server-priced subtotal, the same figure the cart page shows

### Requirement: A cart change is proposed, then applied by the storefront

The assistant SHALL NOT write to the cart directly. A cart change it proposes
SHALL be applied by the storefront to the same cart the rest of the site uses,
and SHALL be subject to the same rules as a change made by clicking, including
the one-per-file cap. An applied change SHALL be visible to the visitor without
a reload.

#### Scenario: Adding an item by asking

- **WHEN** a visitor asks the assistant to add the dice tower to their cart
- **THEN** the cart holds the dice tower
- **AND** the header count updates without a reload

#### Scenario: A proposed change breaks a cart rule

- **WHEN** the assistant proposes a second copy of a file already in the cart
- **THEN** the cart still holds one of that file

#### Scenario: The visitor changes it back

- **WHEN** a visitor removes, on the cart page, a line the assistant added
- **THEN** the line is gone
- **AND** the assistant sees the cart as it now stands

### Requirement: Only the visitor submits an order

The assistant SHALL NOT submit an order. It MAY draft one, and the storefront
SHALL show that draft to the visitor with its lines, its server-priced total and
the details collected, and SHALL submit it only when the visitor confirms it.
The visitor SHALL be able to edit the collected details before confirming, and
SHALL be able to cancel without an order being placed.

Each draft SHALL carry a confirmation issued by the server, which the storefront
holds and returns when the visitor confirms. The assistant SHALL NOT be given
it, in any form, at any point. A submission presented as a confirmed draft SHALL
be refused unless it carries a confirmation the server issued for that draft and
has not already spent, and a confirmation SHALL expire.

#### Scenario: A draft is presented

- **WHEN** the assistant has collected a name and an email and the visitor asks to order
- **THEN** a draft is shown with the lines, the total and the details
- **AND** no order has been recorded

#### Scenario: The visitor corrects the draft

- **WHEN** the visitor edits the email on the draft and confirms
- **THEN** the order is submitted with the edited email

#### Scenario: The visitor cancels

- **WHEN** the visitor dismisses the draft
- **THEN** no order is recorded and no email is sent
- **AND** the cart is unchanged

#### Scenario: The assistant is asked to submit without confirmation

- **WHEN** a visitor tells the assistant to place the order immediately
- **THEN** a draft is still shown and still requires confirmation

#### Scenario: A confirmed draft arrives without its confirmation

- **WHEN** a submission presented as a confirmed draft carries no confirmation, or one the server did not issue
- **THEN** it is refused
- **AND** no order is recorded

#### Scenario: A confirmation is used twice

- **WHEN** a confirmation that has already placed an order is submitted again
- **THEN** the second submission is refused
- **AND** only the first order exists

#### Scenario: The assistant never holds the confirmation

- **WHEN** the messages, tool arguments and tool results of a conversation that produced a draft are inspected
- **THEN** none of them contains the confirmation

### Requirement: A confirmed order follows the ordinary order path

A confirmed draft SHALL be submitted through the storefront's existing order
path, so that pricing, validation, availability and the staff notification
behave exactly as they do for an order placed from the checkout page. A
rejection SHALL be reported to the visitor in the panel in the terms the
storefront already uses, and SHALL leave the cart intact.

#### Scenario: An item goes out of stock before confirmation

- **WHEN** the visitor confirms a draft holding an item that has since gone out of stock
- **THEN** the order is rejected
- **AND** the visitor is told which item is unavailable
- **AND** their cart still holds their other lines

#### Scenario: A successful order

- **WHEN** a draft is confirmed and accepted
- **THEN** the order is recorded and staff are notified as they are for any order
- **AND** the visitor is given the order reference

### Requirement: A conversation is not kept

A conversation SHALL exist only for as long as the visitor is having it.
Reloading the page or closing the panel SHALL start a new one, and no
conversation SHALL be written to the database or to browser storage.

#### Scenario: Reload during a conversation

- **WHEN** a visitor reloads the page and reopens the panel
- **THEN** the conversation starts fresh
- **AND** their cart is still there

### Requirement: The assistant is capped and can be turned off

A single conversation SHALL be capped at 25 messages, and a visitor SHALL be
limited to 3 conversations a day. On reaching either cap the storefront SHALL
say so plainly and SHALL leave the rest of the shop working. Where the assistant
is not configured or its provider fails, the storefront SHALL say the assistant
is unavailable and SHALL NOT break the page.

#### Scenario: The message cap is reached

- **WHEN** a conversation reaches its message cap
- **THEN** the visitor is told the conversation has ended and how to start again
- **AND** the cart, the catalogue and checkout all still work

#### Scenario: The assistant is not configured

- **WHEN** no provider key is configured and a visitor opens the panel
- **THEN** they are told the assistant is unavailable
- **AND** no page fails to render

### Requirement: The provider credential never reaches the browser

The provider key SHALL be held on the server only. It SHALL NOT appear in any
page, client bundle or response body, and the browser SHALL NOT call the
provider directly.

#### Scenario: Inspecting what the browser receives

- **WHEN** the served pages, the client bundle and the chat responses are inspected
- **THEN** none of them contains the provider key
- **AND** every provider call originates on the server

### Requirement: The assistant can explain promo codes but never handle one

The assistant SHALL be able to tell a visitor that the shop issues promo codes,
that subscribing to the mailing list earns one, and where a code is entered: on
the checkout form, or on the draft card in the panel. It SHALL NOT be given any
means of reading, listing, creating, altering, activating, deactivating,
testing, applying or redeeming a code, and SHALL NOT be told any code's value,
including a code the visitor has typed into the draft card. Asked to do any of
those, it SHALL decline and say where the visitor can do it themselves.

A code the visitor types into the conversation SHALL NOT be acted on. The
assistant SHALL point the visitor at the field instead, because acting on it
would mean the assistant handling a code.

#### Scenario: Asked how to get a discount

- **WHEN** a visitor asks whether the shop has any discounts
- **THEN** the assistant explains that subscribing earns a code, entered at
  checkout or on the draft card
- **AND** it states no code

#### Scenario: Asked for a code

- **WHEN** a visitor asks the assistant to give them a promo code
- **THEN** it declines and points them at the opt-in form
- **AND** no code appears in its reply

#### Scenario: Asked to create or change a code

- **WHEN** a visitor asks the assistant to make them a code, raise a code's
  discount, or reactivate an expired one
- **THEN** it declines and says only staff can do that
- **AND** no code is created or changed

#### Scenario: Asked to apply a code to the order it drafted

- **WHEN** a visitor asks the assistant to apply a code to their draft
- **THEN** it tells them to enter it in the promo field on the draft card
- **AND** it does not apply the code itself
- **AND** the draft's total is unchanged until the visitor applies it there

#### Scenario: A code is typed into the conversation

- **WHEN** a visitor types a promo code at the assistant rather than into the field
- **THEN** the draft is not re-priced by that message
- **AND** the assistant points them at the field on the draft card

#### Scenario: Asked whether a code is valid

- **WHEN** a visitor asks the assistant whether a particular code works, or asks
  it to try several
- **THEN** it says it cannot check a code and points them at the field
- **AND** nothing in its reply distinguishes a real code from one that does not exist

#### Scenario: Inspecting what the assistant was given

- **WHEN** the tools, tool results and messages available to the assistant in
  any conversation are inspected, including one where the visitor applied a code
  to the draft
- **THEN** none of them carries a promo code or a means of changing one

### Requirement: A drafted order carries only a code the visitor entered

An order the assistant drafts SHALL be priced as an undiscounted order, apart
from any store-wide sale that applies to everyone, unless the visitor has
entered a promo code into the field on the draft card. Where they have, the
order SHALL be priced, recorded and redeemed exactly as the same code entered on
the checkout form would be.

The code SHALL originate from the visitor's own typing in the browser. The
system SHALL NOT accept a code from the assistant, from a tool result, or from
anywhere in the conversation, so a draft cannot carry a code the visitor did not
enter. Confirming a draft with no code entered SHALL NOT redeem a code and SHALL
NOT consume a code the visitor holds.

#### Scenario: A draft with no code entered

- **WHEN** a visitor who holds a valid code confirms a draft without entering it
- **THEN** the order is placed without that code
- **AND** the code remains unredeemed and usable later

#### Scenario: A draft with a code entered

- **WHEN** a visitor enters a valid code on the draft card and confirms
- **THEN** the order is priced at that code's percentage off
- **AND** the redemption is recorded as it would be for a checkout order

#### Scenario: A draft while a sale is running

- **WHEN** a visitor confirms a draft while a store-wide sale is active
- **THEN** the sale discount applies, as it does for any order

#### Scenario: A code the visitor never entered

- **WHEN** a draft is confirmed and the submitted order is inspected
- **THEN** any code it carries is one the visitor typed into the field
- **AND** no code reached it from the assistant or the conversation

#### Scenario: An unusable code on the draft card

- **WHEN** a visitor enters a code that is unknown, inactive, or already used by
  their email address
- **THEN** they are told which it is, in the same terms the checkout form uses
- **AND** the draft reverts to its undiscounted total
- **AND** no order and no redemption are recorded

#### Scenario: The draft total is not what prices the order

- **WHEN** the total shown on the draft card differs from what the code produces
  at submit
- **THEN** the order is priced by the server at submit, not by the figure shown
- **AND** the visitor is shown the recorded total
