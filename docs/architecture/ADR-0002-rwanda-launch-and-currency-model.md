# ADR-0002 Rwanda Launch and Currency Model

- Status: Accepted for product direction; detailed accounting/tax policy remains open, 2026-11-07
- Decision owners: Project owner, finance/accounting reviewer, and engineering lead

## Context

The project owner specified Rwanda as the initial launch market, RWF as the initial base currency, and `Africa/Kigali` as the initial timezone while requiring later country and currency expansion. Existing operational columns use a generic two-decimal “cents” convention, which is not a general currency model.

## Decision

New-business defaults target RW, RWF, and `Africa/Kigali`. Country, currency, timezone, tax jurisdiction, fiscal calendar, and rounding policy are business configuration. Do not embed Rwanda tax rules in shared calculations. Subscription billing currency remains separate from business operating currency.

Before changing stored amounts, design a migration that preserves old values and records currency precision and historical meaning. Posted foreign-currency transactions retain transaction currency, base-currency amount, exchange rate, rate source, and effective date; later rates do not rewrite history.

## Consequences and open work

- The current `integer cents` and fixed two-decimal conversion functions are insufficient for currency-specific precision.
- A typed money/currency policy and a data migration plan are required before adopting RWF in existing transaction data.
- Rwanda tax rates must be effective-dated configuration; legal interpretation and launch rules require qualified review.
- EBM/VSDC integration requires official protocol review and external approval; the application must not claim certification prematurely.

## Verification

Tests must cover currency precision, rounding, exchange-rate snapshots, allocation currency matching, tax effective dates, and preservation of historical posted values.
