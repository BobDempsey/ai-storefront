## MODIFIED Requirements

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
