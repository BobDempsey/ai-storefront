## ADDED Requirements

### Requirement: The assistant can explain promo codes but never handle one

The assistant SHALL be able to tell a visitor that the shop issues promo codes,
that subscribing to the mailing list earns one, and that a code is entered on
the checkout form. It SHALL NOT be given any means of reading, listing,
creating, altering, activating, deactivating, applying or redeeming a code, and
SHALL NOT be told any code's value. Asked to do any of those, it SHALL decline
and say where the visitor can do it themselves.

#### Scenario: Asked how to get a discount

- **WHEN** a visitor asks whether the shop has any discounts
- **THEN** the assistant explains that subscribing earns a code entered at
  checkout
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
- **THEN** it declines and tells them to enter it on the checkout form
- **AND** the draft's total is unchanged

#### Scenario: Inspecting what the assistant was given

- **WHEN** the tools, tool results and messages available to the assistant in
  any conversation are inspected
- **THEN** none of them carries a promo code or a means of changing one

### Requirement: A drafted order carries no promo code

An order the assistant drafts SHALL be priced exactly as an undiscounted order,
apart from any store-wide sale that applies to everyone. Confirming a draft
SHALL NOT redeem a code, and SHALL NOT consume a code the visitor holds.

#### Scenario: A draft while a code exists

- **WHEN** a visitor who holds a valid code confirms a draft from the panel
- **THEN** the order is placed without that code
- **AND** the code remains unredeemed and usable at checkout

#### Scenario: A draft while a sale is running

- **WHEN** a visitor confirms a draft while a store-wide sale is active
- **THEN** the sale discount applies, as it does for any order
