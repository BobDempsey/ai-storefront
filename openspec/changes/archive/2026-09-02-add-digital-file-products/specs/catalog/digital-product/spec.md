## Purpose

Defines what a downloadable file is as an item in the catalogue: how the
storefront tells a file apart from a printed object, what it shows a buyer
about one, that a file is bought through the same cart and order path as
anything else, and how staff learn that an order owes a file.

## ADDED Requirements

### Requirement: Every catalogue item declares its kind

Each item in the catalogue SHALL be either a physical object or a downloadable
file, and SHALL never be both. The kind SHALL be recorded on the item rather
than inferred from its name, price or description. An item whose kind is not
stated SHALL be treated as a physical object, so that a catalogue written
before this capability existed keeps its meaning.

#### Scenario: Existing item with no kind recorded

- **WHEN** the catalogue holds an item created before kinds existed
- **THEN** the storefront treats it as a physical object

#### Scenario: Kind is not guessed from other fields

- **WHEN** a physical object is named after a file format or describes one
- **THEN** it is still presented as a physical object

### Requirement: A file item carries the facts a buyer needs

A file item SHALL carry its delivered file name, its format and its size, and
the storefront SHALL present all three to the buyer. These SHALL come from the
catalogue, never from the storefront's own code, so that staff adding a file
control what is shown. A physical object SHALL NOT present them.

#### Scenario: File details shown

- **WHEN** a buyer views a file item
- **THEN** its file name, format and size are shown alongside its name and price

#### Scenario: Staff change a file's size

- **WHEN** staff change the recorded size of a file item
- **THEN** the storefront shows the new size without any code change

#### Scenario: Physical object shows no file details

- **WHEN** a buyer views a physical object
- **THEN** no file name, format or size is shown

### Requirement: The storefront separates the two kinds

The storefront index SHALL present physical objects and file items in separate
tabs, each listing only items of its kind, and SHALL build both lists from the
catalogue. Neither list SHALL contain an item that is not in the catalogue.

#### Scenario: A file item is added to the catalogue

- **WHEN** staff add a file item and a buyer loads the index
- **THEN** it appears in the Files tab
- **AND** it does not appear in the Products tab

#### Scenario: Neither tab invents an item

- **WHEN** the catalogue holds no file items
- **THEN** the Files tab lists nothing rather than showing sample entries

### Requirement: A file is bought like any other item

A file item SHALL be added to the cart, priced, and ordered through the same
cart, checkout and order path as a physical object, with no separate flow and
no separate order. Its price SHALL be resolved server-side on the same terms as
any other item, and an order MAY mix file items and physical objects.

#### Scenario: Mixed cart

- **WHEN** a buyer puts a file item and a physical object in one cart and submits it
- **THEN** one order is recorded holding both lines
- **AND** the total is the server-priced sum of both

#### Scenario: File price comes from the server

- **WHEN** an order containing a file item is submitted with a tampered price
- **THEN** the recorded line carries the catalogue price

### Requirement: A file item is always orderable

A file item SHALL always be available to order, because supply does not run
out. The storefront SHALL NOT offer staff a way to make a file unavailable
through stock, and SHALL NOT present a file item as out of stock.

#### Scenario: File item in the Files tab

- **WHEN** a buyer views a file item
- **THEN** it offers an Add to cart control
- **AND** it is never labelled out of stock

#### Scenario: File item sitting in a cart

- **WHEN** a cart holds a file item
- **THEN** that line is never marked unavailable on the grounds of stock

### Requirement: The buyer is told how a file arrives

Wherever a file item can be added to the cart, and again on the order
confirmation, the storefront SHALL state that the file is sent by email once
payment is arranged. It SHALL NOT offer a download control, because no
download exists.

#### Scenario: Buyer views a file item

- **WHEN** a buyer views a file item
- **THEN** they are told the file is emailed after payment is arranged
- **AND** no download control is offered, enabled or disabled

#### Scenario: Order containing a file is submitted

- **WHEN** a buyer submits an order containing at least one file item
- **THEN** the confirmation tells them the file will be emailed once payment is arranged

### Requirement: Staff are told which lines are files

The order notification sent to staff SHALL identify which of the order's lines
are file items and SHALL name the file owed for each, so that staff know an
email with an attachment is due and which file to attach. An order containing
no file items SHALL say nothing about files.

#### Scenario: Order with a file line

- **WHEN** staff receive the notification for an order containing a file item
- **THEN** that line is marked as a file
- **AND** the file name to be sent is stated

#### Scenario: Order with no file lines

- **WHEN** staff receive the notification for an order of physical objects only
- **THEN** the notification says nothing about files

### Requirement: A file is ordered once

A cart SHALL hold at most one of any file item, and an order SHALL NOT record a
file line with a quantity above one. A second copy delivers nothing the buyer
does not already have. The storefront SHALL NOT offer a quantity control on a
file line, and the server SHALL reject an order that carries a file line with a
quantity above one, whatever the client believed when it submitted.

#### Scenario: File already in the cart

- **WHEN** a buyer adds a file item that is already in their cart
- **THEN** the cart still holds one of that file
- **AND** the cart total is unchanged

#### Scenario: No quantity control on a file line

- **WHEN** a buyer views a cart holding a file line
- **THEN** that line states a quantity of one and offers no control to change it
- **AND** it still offers a control that removes it

#### Scenario: Client bypasses the storefront

- **WHEN** an order carrying a file line with a quantity above one is submitted directly to the order endpoint
- **THEN** it is rejected
- **AND** no order or order line is recorded

#### Scenario: Physical quantities are untouched

- **WHEN** a buyer adds the same physical object twice
- **THEN** that line reads a quantity of two and its quantity control still works
