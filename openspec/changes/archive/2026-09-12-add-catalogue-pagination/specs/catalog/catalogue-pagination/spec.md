## Purpose

Splits the catalogue into pages so a visitor meets a screenful rather than
everything the shop sells, and keeps which page they are on in the address so a
page can be reloaded, shared and stepped back out of.

## ADDED Requirements

### Requirement: The catalogue is served one page at a time

A catalogue request SHALL answer with one page of items and with how many items
the whole request matched, so the storefront can say what it is showing without
fetching the rest.

A request that names no page SHALL be answered with the first. A page beyond the
end SHALL be answered with an empty page and the true total rather than an
error, so a stale link is a dead end the visitor can see rather than a failure.

The page size SHALL be the storefront's to choose, not the caller's to raise
without limit: a request asking for more than the allowed maximum SHALL be
refused rather than served.

Items SHALL keep the order they have without paging, so paging forward never
shows an item the previous page already showed.

#### Scenario: The first page

- **WHEN** the catalogue is requested with no page named
- **THEN** the first page of items is returned, with the total for the whole catalogue

#### Scenario: A later page

- **WHEN** the second page is requested
- **THEN** it holds the items after the first page's, and none of them

#### Scenario: A page past the end

- **WHEN** a page beyond the last is requested
- **THEN** the answer is an empty page carrying the true total
- **AND** the request is not refused

#### Scenario: An oversized page request

- **WHEN** a caller asks for more items a page than the storefront allows
- **THEN** the request is refused

### Requirement: Each kind of item pages on its own

The printed goods and the downloadable files SHALL page independently, each with
its own page number and its own controls, because the two hold different numbers
of items and a shared page number would empty one of them.

Moving one kind to another page SHALL NOT move the other.

#### Scenario: Paging the printed goods

- **WHEN** a visitor moves the printed goods to their second page
- **THEN** the printed goods show their second page
- **AND** the files are still showing the page they were on

#### Scenario: A kind that fits on one page

- **WHEN** a kind has no more items than fit on a page
- **THEN** no paging controls are shown for it

### Requirement: The page is carried in the address

Which page each kind is on SHALL be part of the catalogue page's address,
alongside any search term. Reloading SHALL reproduce the same page, and opening
the address elsewhere SHALL show the same page against the same catalogue.

Moving between pages SHALL be steppable with the browser's Back button, because
a visitor who pages forward and wants to return expects it to work.

The first page SHALL leave no page number in the address, so an unpaged
catalogue keeps the plain address it has today.

#### Scenario: Reloading a page

- **WHEN** a visitor reloads while on the second page
- **THEN** they are still on the second page, showing the same items

#### Scenario: Back from a later page

- **WHEN** a visitor moves to the second page and presses Back
- **THEN** they are on the first page again

#### Scenario: The first page is the plain address

- **WHEN** a visitor returns to the first page
- **THEN** the address carries no page number

### Requirement: Searching starts from the first page

Changing the search term SHALL return every kind to its first page. Page four of
the previous results describes nothing about the new ones, and a visitor who
types a word and is shown an empty page reads it as the shop having nothing.

The count each kind reports SHALL be the total for the search, not the number on
the page, so a visitor can see there is more than they are looking at.

#### Scenario: Searching while on a later page

- **WHEN** a visitor on the second page types a search term
- **THEN** they are taken to the first page of the results for that term

#### Scenario: What the count means

- **WHEN** a search matches more items than fit on a page
- **THEN** the count shown is the whole number matched, not the number on screen

### Requirement: Paging works on a phone

The paging controls SHALL be usable at phone width: reachable without a
horizontal scroll, with targets a thumb can hit, and legible in both colour
schemes. Where the full run of page numbers does not fit, the controls SHALL
reduce to moving between pages and saying which page the visitor is on rather
than overflowing the page.

#### Scenario: Paging at phone width

- **WHEN** the catalogue is viewed at phone width with more than one page
- **THEN** the paging controls fit within the screen and can be operated
- **AND** the page does not scroll sideways
