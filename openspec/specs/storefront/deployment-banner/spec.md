# storefront/deployment-banner Specification

## Purpose

Tells whoever is looking at the storefront that they are not looking at the live
shop, so a test order, a screenshot or a demo is never mistaken for the real
thing and the live shop is never mistaken for a copy.

## Requirements

### Requirement: A deployment that is not the live shop says so

Where the storefront is configured as an environment other than the live shop,
every page SHALL carry a visible marker naming that environment, and the browser
tab title SHALL carry it too. The marker SHALL be legible in both colour schemes
and SHALL be visible without scrolling.

The tab title matters as much as the page: a person with several tabs open sees
the title and not the page, and that is exactly when the wrong window gets used.

#### Scenario: Looking at a development server

- **WHEN** the storefront is configured as a development environment
- **THEN** every page shows a marker naming it
- **AND** the browser tab title carries the same name

#### Scenario: Looking at a preview deployment

- **WHEN** the storefront is configured as a preview environment
- **THEN** the marker names that environment rather than saying only that it is not production

#### Scenario: Both colour schemes

- **WHEN** the marker is shown in either colour scheme
- **THEN** it is legible against the background behind it

### Requirement: The live shop is unmarked

Where no environment is configured, the storefront SHALL render exactly as it
does today: no marker, and a tab title unchanged. An unset value SHALL mean the
live shop, so a deployment that was never told about this behaves as it always
has.

A marker that can appear on the live shop is worse than no marker, because a
customer would see it and because the person testing would stop trusting it.

#### Scenario: The live shop

- **WHEN** no environment is configured
- **THEN** no marker is rendered anywhere on the page
- **AND** the tab title is exactly what it was before

#### Scenario: Configured as production

- **WHEN** the environment is configured as production
- **THEN** no marker is rendered, the same as leaving it unset

### Requirement: The marker does not obstruct the shop

The marker SHALL NOT cover a control, block a link, or prevent any part of the
storefront from being used. Everything a visitor can do on the live shop SHALL
remain doable with the marker shown, including placing an order.

#### Scenario: Shopping with the marker shown

- **WHEN** a visitor on a marked deployment adds to the cart and places an order
- **THEN** every step works as it does on the live shop
