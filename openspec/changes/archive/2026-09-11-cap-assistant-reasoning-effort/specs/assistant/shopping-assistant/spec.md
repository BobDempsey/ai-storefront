## MODIFIED Requirements

### Requirement: The assistant is capped and can be turned off

A single conversation SHALL be capped at 25 messages, and a visitor SHALL be
limited to 3 conversations a day. On reaching either cap the storefront SHALL
say so plainly and SHALL leave the rest of the shop working. Where the assistant
is not configured or its provider fails, the storefront SHALL say the assistant
is unavailable and SHALL NOT break the page.

The storefront SHALL also bound how long a visitor waits. It SHALL ask the
provider for no more deliberation than a shop question needs, rather than
accepting whatever the provider does by default, and SHALL keep every other
rule in this specification at that setting. A reply to a plain catalogue
question SHALL arrive in seconds rather than tens of seconds.

#### Scenario: The message cap is reached

- **WHEN** a conversation reaches its message cap
- **THEN** the visitor is told the conversation has ended and how to start again
- **AND** the cart, the catalogue and checkout all still work

#### Scenario: The assistant is not configured

- **WHEN** no provider key is configured and a visitor opens the panel
- **THEN** they are told the assistant is unavailable
- **AND** no page fails to render

#### Scenario: A plain catalogue question is answered promptly

- **WHEN** a visitor asks what the shop sells in a category
- **THEN** the assistant looks it up and answers
- **AND** the answer arrives in seconds rather than tens of seconds

#### Scenario: The rules survive the faster setting

- **WHEN** the assistant answers at the deliberation the storefront asks for
- **THEN** it still calls a tool rather than inventing an item
- **AND** it still declines a question that is not about this shop
- **AND** it still refuses to say whether a promo code exists

## ADDED Requirements

### Requirement: The panel shows that it is working while a reply is coming

Nothing streams, so a reply arrives whole after a wait of several seconds. For
the whole of that wait the panel SHALL show that a reply is coming, with a
moving indicator and a label, and SHALL announce it to assistive technology.

The label SHALL change once while the visitor waits, after roughly three seconds,
from saying that the assistant is thinking to saying the reply is nearly ready.
A label that never moves stops being read and starts reading as a page that has
hung. The indicator SHALL disappear when the reply arrives, and the next
question SHALL start the wait from the beginning rather than from where the last
one ended.

#### Scenario: Waiting for a reply

- **WHEN** a visitor sends a message
- **THEN** a moving indicator and a label appear, saying the assistant is thinking
- **AND** they are announced to a screen reader

#### Scenario: The wait goes on

- **WHEN** roughly three seconds have passed and no reply has arrived
- **THEN** the label changes to say the reply is nearly ready

#### Scenario: The reply arrives

- **WHEN** the reply arrives
- **THEN** the indicator and the label are gone

#### Scenario: The next question

- **WHEN** the visitor sends a second message after a long first wait
- **THEN** the label starts again at the assistant thinking
