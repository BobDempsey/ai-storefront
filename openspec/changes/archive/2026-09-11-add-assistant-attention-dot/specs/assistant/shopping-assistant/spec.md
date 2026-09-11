## ADDED Requirements

### Requirement: The control carries an attention cue until the panel is opened

The control in the site chrome SHALL carry a small visual cue while the visitor
has not opened the panel since the page was loaded, and SHALL drop that cue as
soon as they open it.

The cue SHALL be present again after the page is reloaded, whether or not the
visitor has opened the panel before, so a visitor who has not engaged keeps
being offered it. Within a single page load, once the panel has been opened the
cue SHALL NOT return, including after the visitor closes the panel again.

The cue SHALL carry no number, no text and no unread count. It SHALL animate,
and the cue SHALL remain visible against the chrome behind it in both the light
and the dark scheme. Where the browser reports `prefers-reduced-motion: reduce`,
the cue SHALL still be shown but SHALL NOT animate, because a visitor who cannot
take movement still needs the cue.

The cue SHALL NOT convey information to assistive technology beyond what the
control's own name already says, since it reports nothing a visitor needs read
aloud.

#### Scenario: A visitor who has not opened the panel

- **WHEN** a visitor loads a page and has not opened the panel since it loaded
- **THEN** the control carries the cue

#### Scenario: The visitor opens the panel

- **WHEN** the visitor activates the control and the panel opens
- **THEN** the cue is gone

#### Scenario: The visitor closes the panel again

- **WHEN** the visitor closes a panel they opened, without reloading the page
- **THEN** the cue stays gone

#### Scenario: A reload

- **WHEN** a visitor who opened the panel reloads the page
- **THEN** the control carries the cue again

#### Scenario: A visitor who cannot take movement

- **WHEN** the browser reports `prefers-reduced-motion: reduce`
- **THEN** the cue is shown without animation
- **AND** it is not hidden

#### Scenario: Both schemes

- **WHEN** the page renders in either the light or the dark scheme
- **THEN** the cue is visible against the chrome behind it

#### Scenario: What assistive technology is told

- **WHEN** assistive technology inspects the control while the cue is shown
- **THEN** the control's name is what it was without the cue
- **AND** the cue itself announces nothing

### Requirement: Only the visitor opens the panel

The storefront SHALL open the chat panel only in response to the visitor asking
for it. Nothing else SHALL open it: not a first visit, not elapsed time, not
scroll position, and not an attempt to leave the page.

#### Scenario: A first-time visitor arrives

- **WHEN** a visitor loads the storefront for the first time
- **THEN** the panel is closed
- **AND** the control carries the attention cue instead

#### Scenario: The visitor does nothing

- **WHEN** a visitor reads a page without activating the control
- **THEN** the panel stays closed for as long as they are on it

## REMOVED Requirements

### Requirement: The panel introduces itself once on a first visit

**Reason**: The panel opening by itself takes over the page of a visitor who
asked for nothing, and it could only ever happen once per browser, so it did
nothing for a returning visitor who had closed it. The attention cue added by
this change points at the assistant without taking the page and comes back on
every page load, which covers the same need better. Keeping both would mean a
first-time visitor got the panel opened over their first page and the cue
cleared before they ever saw it.

**Migration**: None for a visitor: the panel simply no longer opens on its own,
and the control with its cue is in the same place it was. The `assistant-greeted`
browser flag that gated the auto-open is no longer read by anything and can be
left to expire; a visitor who still has it stored is unaffected either way. The
seeded Playwright `storageState` that stopped a clean test context being treated
as a first visit is no longer needed. Nothing about the cue is stored either, so
no browser carries state for this capability at all.
