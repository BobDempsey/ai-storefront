## Purpose

Defines how the storefront treats a cart line whose product can no longer be
ordered — removed from the catalogue or marked out of stock — so that a
customer always understands why, can act on it, and is never allowed to submit
an order that the server will reject.

## Requirements

### Requirement: Availability is resolved from the catalogue

The storefront SHALL determine whether a cart line can be ordered from the
catalogue at the time the cart is displayed, never from anything stored in the
browser. A line SHALL be treated as unavailable when its product no longer
exists in the catalogue or is marked out of stock.

#### Scenario: Product goes out of stock while it sits in the cart

- **WHEN** a customer has a product in their cart and staff mark that product out of stock
- **AND** the customer reloads or returns to the cart
- **THEN** that line is shown as unavailable

#### Scenario: Product returns to stock

- **WHEN** a line was shown as unavailable because the product was out of stock
- **AND** staff mark the product in stock again
- **AND** the customer reloads or returns to the cart
- **THEN** the line is shown as ordinary and orderable

### Requirement: Deleted products are removed, unavailable products are kept

The storefront SHALL remove a cart line automatically when its product no
longer exists in the catalogue, because no action is available to the customer
for a product that cannot be shown. The storefront SHALL NOT remove a line
automatically merely because the product is out of stock; such a line SHALL
remain in the cart until the customer removes it.

#### Scenario: Product deleted from the catalogue

- **WHEN** the cart is displayed and one of its products no longer exists in the catalogue
- **THEN** that line is removed from the cart without the customer acting

#### Scenario: Out-of-stock line persists

- **WHEN** the cart is displayed and one of its products is out of stock
- **THEN** the line remains in the cart, marked unavailable
- **AND** it is still present after the customer reloads the page

### Requirement: Unavailable lines are visibly marked and removable

An unavailable line SHALL be marked in the cart with text stating that it
cannot currently be ordered, and SHALL offer a control that removes it. The
marking SHALL be conveyed by text and not by colour alone, and SHALL be legible
in both the light and dark colour schemes.

#### Scenario: Customer removes the unavailable line

- **WHEN** a customer activates the removal control on an unavailable line
- **THEN** the line is removed from the cart
- **AND** the cart's item count and subtotal update to match

#### Scenario: Marking does not rely on colour

- **WHEN** an unavailable line is rendered
- **THEN** its unavailability is stated in text
- **AND** that text meets the contrast requirement in both colour schemes

### Requirement: Subtotal excludes unavailable lines and says so

The cart subtotal SHALL be the server-priced sum of the orderable lines only.
Whenever the cart holds at least one unavailable line, the storefront SHALL
state alongside the subtotal that unavailable items are excluded from it.

#### Scenario: Subtotal with one unavailable line

- **WHEN** a cart holds two orderable lines and one unavailable line
- **THEN** the subtotal is the server-priced total of the two orderable lines
- **AND** the customer is told that the unavailable item is not included

### Requirement: Checkout is blocked while the cart holds an unavailable line

While the cart holds an unavailable line, the storefront SHALL prevent the
customer from advancing to checkout and SHALL explain what must be removed
first, naming the affected products. This SHALL hold on the cart page and on
the checkout page alike, however the customer reached it.

#### Scenario: Continuing to checkout is refused

- **WHEN** a cart holds an unavailable line and the customer attempts to continue to checkout
- **THEN** they do not reach the checkout form
- **AND** they are told which product must be removed first

#### Scenario: Arriving at checkout directly

- **WHEN** a customer opens the checkout page by URL while their cart holds an unavailable line
- **THEN** the order cannot be submitted
- **AND** they are told which product must be removed first

#### Scenario: Last unavailable line removed

- **WHEN** the customer removes the last unavailable line from the cart
- **THEN** checkout becomes available without a page reload

#### Scenario: Every line unavailable

- **WHEN** every line in the cart is unavailable
- **THEN** checkout is unavailable
- **AND** the customer is told the cart contains nothing that can currently be ordered

### Requirement: The server remains the authority on availability

The server SHALL reject an order containing a product that is deleted or out of
stock, whatever the client believed when it submitted, and SHALL create no
partial order. The rejection SHALL identify the products that caused it.

#### Scenario: Stock changes between the cart check and submission

- **WHEN** a customer submits an order and a product in it went out of stock after their cart was last priced
- **THEN** the order is rejected
- **AND** no order or order line is recorded
- **AND** the response identifies the product that caused the rejection

#### Scenario: Client bypasses the storefront

- **WHEN** an order containing an out-of-stock product is submitted directly to the order endpoint
- **THEN** it is rejected on the same terms

### Requirement: A rejected submission returns the customer to an actionable cart

When an order is rejected because a product is unavailable, the storefront
SHALL tell the customer which product was at fault and SHALL leave the cart in
a state where that line is marked unavailable and can be removed. The cart
SHALL NOT be cleared, and the customer's entered details SHALL NOT be
discarded.

#### Scenario: Order rejected at submission

- **WHEN** the customer submits an order and the server rejects it as unavailable
- **THEN** the customer is shown which product is unavailable
- **AND** the cart still holds their other lines
- **AND** the details they typed into the checkout form are still there
- **AND** removing the named line makes submission possible again
