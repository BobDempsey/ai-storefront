## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: A drafted order carries no promo code

**Reason**: A draft can now carry a code, so the blanket prohibition is wrong.
What it was protecting - that the assistant cannot produce a discount - is kept
in full by its replacement, which requires the code to have come from the
visitor's own typing rather than from the model or the conversation.

**Migration**: Replaced by "A drafted order carries only a code the visitor
entered" below. A draft with no code entered behaves exactly as before.

## ADDED Requirements

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
