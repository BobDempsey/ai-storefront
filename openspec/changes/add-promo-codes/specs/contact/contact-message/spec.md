## ADDED Requirements

### Requirement: The contact form can also subscribe the sender

The contact form SHALL offer the sender the option of joining the mailing list
with the address they are already giving for their message. The option SHALL be
off unless the sender turns it on, and SHALL NOT ask for the address again.
Whether the sender takes it SHALL NOT change how the message is validated,
delivered or reported.

#### Scenario: Sender opts in with their message

- **WHEN** a sender completes the form, turns the option on and submits
- **THEN** the message is delivered to staff as usual
- **AND** the address they gave is added to the mailing list

#### Scenario: Sender does not opt in

- **WHEN** a sender completes the form and leaves the option off
- **THEN** the message is delivered
- **AND** their address is not added to the mailing list

#### Scenario: An invalid submission

- **WHEN** a submission fails validation while the option is on
- **THEN** it is rejected as it would be with the option off
- **AND** no address is added to the mailing list

#### Scenario: Subscribing fails but the message does not

- **WHEN** the option is on and the address cannot be added to the mailing list
- **THEN** the message is still delivered and the sender is told it was sent
- **AND** the failure is logged on the server
