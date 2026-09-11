## Purpose

Defines how the storefront chooses, remembers and applies a light or dark
colour scheme, and the navbar control a visitor uses to change it.

## Requirements

### Requirement: Colour mode selection

The storefront SHALL support three colour modes — `light`, `dark` and
`system` — and SHALL default to `system` for a visitor with no stored
preference. In `system` mode the storefront SHALL render the scheme reported by
the browser's `prefers-color-scheme` setting.

#### Scenario: First visit with no stored preference

- **WHEN** a visitor loads any page and no colour-mode preference is stored
- **THEN** the mode is `system`
- **AND** the page renders dark if the browser reports `prefers-color-scheme: dark`, and light otherwise

#### Scenario: Explicit choice overrides the operating system

- **WHEN** a visitor has selected `light` and the browser reports `prefers-color-scheme: dark`
- **THEN** the page renders light

### Requirement: Navbar colour mode control

The navbar SHALL present a control that changes the colour mode, on every page
that uses the default layout. The control SHALL offer exactly two schemes,
light and dark, and activating it SHALL switch to whichever of the two is not
currently in effect. The control SHALL NOT offer `system` as a choice and SHALL
NOT display a distinct `system` indicator. The control SHALL indicate the
scheme currently in effect and SHALL be operable by keyboard and labelled for
assistive technology.

A visitor whose stored preference is still `system` SHALL see the indicator for
the scheme the browser is actually rendering, and their first activation SHALL
set the opposite scheme as an explicit preference.

#### Scenario: Toggling from light to dark

- **WHEN** a visitor viewing the storefront in light renders activates the navbar control
- **THEN** the page switches to the dark scheme without a full page reload

#### Scenario: Toggling back from dark to light

- **WHEN** a visitor viewing the storefront in dark renders activates the navbar control
- **THEN** the page switches to the light scheme
- **AND** no third state is reachable by activating the control again

#### Scenario: A visitor still on the system default

- **WHEN** a visitor has no stored preference, the browser reports `prefers-color-scheme: dark`, and they activate the control
- **THEN** the indicator before the activation was the dark-scheme indicator
- **AND** the page switches to light and stores light as an explicit preference

#### Scenario: Keyboard operation

- **WHEN** a visitor focuses the control with the keyboard and activates it
- **THEN** the colour mode changes in the same way as a pointer activation

#### Scenario: Accessible name

- **WHEN** assistive technology inspects the control
- **THEN** it exposes a name describing the action and the scheme currently in effect

### Requirement: Preference persistence

A colour mode chosen by the visitor SHALL persist in that browser across page
navigations, reloads and later sessions, until the visitor changes it again or
clears site data. The preference SHALL be stored only in the visitor's browser
and SHALL NOT be transmitted to the server or associated with an order.

#### Scenario: Preference survives a reload

- **WHEN** a visitor selects `dark` and then reloads the page
- **THEN** the page renders dark

#### Scenario: Preference survives navigation

- **WHEN** a visitor selects `dark` on the catalogue and navigates to a product page
- **THEN** the product page renders dark

#### Scenario: Unreadable storage

- **WHEN** the browser blocks access to local storage
- **THEN** the storefront renders in `system` mode and remains fully usable
- **AND** no error is surfaced to the visitor

### Requirement: No flash of the wrong scheme

The stored colour mode SHALL be applied before the first paint, so a visitor
whose preference is `dark` never sees light-scheme content while the page
loads.

#### Scenario: Returning dark-mode visitor loads a page

- **WHEN** a visitor whose stored preference is `dark` loads any page
- **THEN** the first painted frame is already dark

### Requirement: Legible content in both schemes

All chrome and content rendered by the default layout — background, header,
navigation links, cart indicator and footer — SHALL be legible in both schemes
and SHALL meet WCAG AA contrast for text.

#### Scenario: Dark scheme chrome

- **WHEN** the page renders in the dark scheme
- **THEN** the header, footer and navigation text meet WCAG AA contrast against their backgrounds

#### Scenario: Cart badge in both schemes

- **WHEN** the cart contains items in either scheme
- **THEN** the cart count remains visible and legible
