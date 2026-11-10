# Spec Delta

## REMOVED Requirements

### Requirement: A visitor can send a message from the storefront

**Reason**: The form is the spam vector. An unauthenticated route that delivers straight to the staff inbox has no defence left once validation and the rate limit are cleared.
**Migration**: None. The demo storefront offers no contact channel. `/contact` stops resolving and the link leaves the site chrome.

### Requirement: The shop's address is not published in the page

**Reason**: Moved, not dropped. The guarantee is about the shop's own address rather than about the form, so it belongs with `storefront/shop-identity` now that the form is gone.
**Migration**: The same requirement is added to `storefront/shop-identity`. Nothing about the delivered page changes.

### Requirement: Submissions are validated before anything is sent

**Reason**: There is no submission to validate.
**Migration**: None. The contact schema and the route that used it are both removed.

### Requirement: Sender-supplied text cannot inject markup into the staff inbox

**Reason**: No sender text reaches the staff inbox by this path. Order and newsletter mail keep their own escaping requirements.
**Migration**: None.

### Requirement: Staff can reply directly to the sender

**Reason**: No contact email is sent, so there is nothing to reply to.
**Migration**: None.

### Requirement: The contact route is rate limited

**Reason**: The route is removed, and a removed route needs no allowance of its own.
**Migration**: The order and opt-in routes keep their own independent limits, unchanged.

### Requirement: The sender is told whether the message actually went

**Reason**: Nothing is sent, so there is no outcome to report.
**Migration**: None.

### Requirement: The contact form can also subscribe the sender

**Reason**: The form that carried the offer is gone.
**Migration**: A visitor can still subscribe from the newsletter invitation or at checkout. Both are unchanged.
