# Platform Super Admin — Token Economy & Immutable Ledger

## 1. Token Economy Model

Tokens represent the fundamental unit of consumption across the Clyptus platform (e.g. posting jobs, executing AI candidate matching, parsing resumes, initiating video interviews).

### 1.1 Atomic Ledger Architecture
Direct balance mutations (`UPDATE organisation_token_balances SET balance = x`) are strictly forbidden in business logic.
All adjustments must invoke `PlatformTokenService.adjustTokens()`:

1. Opens a database transaction (`$transaction`).
2. Retrieves and locks current balance (`balanceBefore`).
3. Computes `balanceAfter = balanceBefore + delta`.
4. Enforces non-negative condition (`balanceAfter >= 0`).
5. Updates `OrganisationTokenBalance`.
6. Appends an immutable `TokenTransaction` entry.
7. Logs an audited security event.

### 1.2 Transaction Classification
- `PURCHASE`: Paid token acquisition by tenant.
- `ALLOCATION`: Platform Super Admin promotional or contract grant.
- `CONSUMPTION`: Automated debit when a platform feature is consumed.
- `REFUND`: Reversal of an erroneous or cancelled feature charge.
- `ADJUSTMENT`: Manual administrative correction.
- `EXPIRATION`: Expired unused tokens at cycle completion.
- `REVERSAL`: Payment chargeback or disputed transaction debit.
