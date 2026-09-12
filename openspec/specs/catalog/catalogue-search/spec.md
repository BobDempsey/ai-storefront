# catalog/catalogue-search Specification

## Purpose

Lets a visitor find an item in the catalogue by typing words from its name or
its description, rather than reading the whole list, and keeps that search in
the page's address so it can be reloaded, shared and stepped back out of.

## Requirements

### Requirement: Search is reachable from every page, through a quick search panel

The storefront SHALL offer a search control in the site chrome, on every page
that uses the default layout. The control SHALL be recognisable as search and
SHALL be reachable by keyboard.

Using it SHALL open a quick search panel over the page, with its own field
focused and ready to type into. The panel SHALL NOT navigate the visitor away
from the page they are on, and SHALL NOT discard their cart.

Before anything is typed the panel SHALL already list the catalogue, so it is
useful on the first keystroke rather than after it. Typing SHALL narrow that
list to what matches, by the same rule the catalogue page uses.

Choosing an item SHALL take the visitor to that item's page. The panel SHALL
also offer taking the typed term to the catalogue page as an ordinary search,
for a visitor who wants the full results rather than one item.

The panel SHALL be operable from the keyboard alone: moving through the list,
choosing an item, and closing the panel without choosing anything.

#### Scenario: Opening the panel

- **WHEN** a visitor on any page uses the search control in the chrome
- **THEN** a search panel opens over the page with its field focused
- **AND** the page beneath it is unchanged and the cart is intact

#### Scenario: What the panel shows before anything is typed

- **WHEN** the panel opens and nothing has been typed
- **THEN** it lists the catalogue's items, ready to be chosen

#### Scenario: Typing narrows the panel

- **WHEN** a visitor types a term into the panel
- **THEN** the list narrows to the items that term matches
- **AND** a term that matches nothing says so rather than showing an empty list

#### Scenario: Choosing an item

- **WHEN** a visitor chooses an item from the panel
- **THEN** they arrive at that item's page and the panel is closed

#### Scenario: Taking the search to the catalogue

- **WHEN** a visitor with a term typed chooses to see all results
- **THEN** they arrive at the catalogue page with that term already searched

#### Scenario: Keyboard alone

- **WHEN** a visitor moves through the list with the arrow keys and presses Enter
- **THEN** the highlighted item opens, without a pointer being used

#### Scenario: Closing without choosing

- **WHEN** a visitor presses Escape
- **THEN** the panel closes, the page beneath is unchanged, and nothing was searched

### Requirement: The catalogue page carries a search field

The catalogue page SHALL show a search field beside its heading. Typing in it
SHALL narrow the catalogue to matching items without the visitor submitting
anything, and without the page navigating.

Clearing the field SHALL restore the whole catalogue. The field SHALL offer a
way to clear it that does not require selecting the text first.

#### Scenario: Narrowing the catalogue

- **WHEN** a visitor types a word that some items carry
- **THEN** only the items that match are listed

#### Scenario: Clearing the search

- **WHEN** the visitor clears the field
- **THEN** the whole catalogue is listed again

### Requirement: What a search matches

A search term SHALL match an item when the term appears in the item's name or in
its description, ignoring case and ignoring leading or trailing whitespace. A
term that appears in neither SHALL NOT match.

Matching SHALL be a plain containment test on those two fields. It SHALL NOT
rank, stem, correct spelling or match on any other field, so that what the
visitor sees can be explained by reading the item.

An empty term, or one that is only whitespace, SHALL mean no search at all: the
whole catalogue is listed.

#### Scenario: A word in the name

- **WHEN** the term is a word from an item's name, in any case
- **THEN** that item is among the results

#### Scenario: A word in the description only

- **WHEN** the term appears in an item's description but not its name
- **THEN** that item is among the results

#### Scenario: A word the catalogue does not carry

- **WHEN** the term appears in neither the name nor the description of any item
- **THEN** no items are listed and the visitor is told so

#### Scenario: Whitespace only

- **WHEN** the term is empty or only spaces
- **THEN** the whole catalogue is listed, as though no search had been made

### Requirement: Both kinds of item are searched, and each says what it found

One term SHALL filter both the printed goods and the downloadable files. The
storefront SHALL state, for each kind, how many of its items the term matched,
so a visitor who is looking at one kind can see that the other holds results.

Where a kind has no matches, the storefront SHALL say so in that kind's own
place, rather than showing an empty list with no explanation.

#### Scenario: Matches in both kinds

- **WHEN** a term matches printed goods and files
- **THEN** both lists are filtered to their matches
- **AND** each states how many it matched

#### Scenario: Matches in one kind only

- **WHEN** a term matches only files
- **THEN** the files list shows them and states its count
- **AND** the printed goods say plainly that nothing there matched

#### Scenario: A search that matches nothing at all

- **WHEN** a term matches no item of either kind
- **THEN** the visitor is told the search found nothing, and how to clear it

### Requirement: A search is carried in the page's address

The search term SHALL be part of the catalogue page's address. Reloading the
page SHALL reproduce the same search, and opening the address elsewhere SHALL
show the same results against the same catalogue.

Changing the term SHALL NOT add an entry to the visitor's history for every
keystroke. Going back SHALL leave the shop rather than replay a search letter by
letter.

Clearing the search SHALL leave a plain catalogue address, carrying no empty
search term.

#### Scenario: Reloading a search

- **WHEN** a visitor reloads the page while a search is active
- **THEN** the field holds the same term and the same items are listed

#### Scenario: Sharing a search

- **WHEN** the address is opened in another browser
- **THEN** it shows the same search term and the same matches

#### Scenario: Going back after typing

- **WHEN** a visitor types a term one letter at a time and then presses Back once
- **THEN** they leave the catalogue page rather than stepping through the letters

#### Scenario: Clearing leaves no trace in the address

- **WHEN** the visitor clears the field
- **THEN** the address carries no search term

### Requirement: A search changes what is listed and nothing else

A search SHALL NOT change an item's price, its sale price, its availability or
what adding it to the cart does. It SHALL NOT empty or reorder the cart, and it
SHALL NOT prevent an order being placed.

An item that is out of stock SHALL still be listed when it matches, marked as it
is when no search is active, so a visitor is not told the shop has nothing when
it has something it cannot sell today.

#### Scenario: A sale price under search

- **WHEN** a store-wide sale is active and a visitor searches for an item it covers
- **THEN** the item shows the same sale price it shows in the unfiltered catalogue

#### Scenario: The cart is untouched

- **WHEN** a visitor with items in the cart searches, then clears the search
- **THEN** the cart holds exactly what it held before

#### Scenario: An out-of-stock match

- **WHEN** a term matches an item that is out of stock
- **THEN** the item is listed and marked out of stock, as it is without a search
