## MODIFIED Requirements

### Requirement: The catalogue page's search field opens the quick search panel

The catalogue page SHALL show a search field beside its heading. Clicking or
focusing that field SHALL open the quick search panel, carrying any term already
in the field into the panel, so the visitor continues rather than starts again.

The field SHALL NOT filter the catalogue as it is typed into, because it is no
longer typed into: the panel's own field is where a term is entered, and the
panel is what narrows. The catalogue page's field SHALL still display the term
the page is currently filtered by, so a visitor arriving from a shared link can
read what was searched, and SHALL still offer a way to clear it that does not
require selecting the text first.

Clearing the field SHALL restore the whole catalogue, as before, and SHALL NOT
open the panel.

Taking a term to the catalogue page SHALL add one history entry, whatever the
length of the term, so that Back undoes the search rather than the typing. It
is a deliberate step, as paging is, so Back SHALL return to the unsearched
catalogue rather than leaving the page.

#### Scenario: Clicking the field

- **WHEN** a visitor clicks the catalogue page's search field
- **THEN** the quick search panel opens with its own field focused
- **AND** the catalogue beneath is unchanged until they choose something

#### Scenario: A term already in the field

- **WHEN** the page is filtered by a term and the visitor clicks the field
- **THEN** the panel opens already narrowed to that term, not empty

#### Scenario: Reaching the field from the keyboard

- **WHEN** a visitor moves focus to the field with the Tab key
- **THEN** the panel opens, and Escape closes it without searching anything

#### Scenario: The field still reports the active search

- **WHEN** a visitor loads an address carrying a search term
- **THEN** the field shows that term and the catalogue is filtered by it

#### Scenario: Going back after a search

- **WHEN** a visitor searches from the panel and presses Back once
- **THEN** they are on the unsearched catalogue page, not stepping through the
  letters they typed
- **AND** a second Back leaves the catalogue for wherever they came from

#### Scenario: Clearing the search

- **WHEN** the visitor clears the field
- **THEN** the whole catalogue is listed again and no panel opens
