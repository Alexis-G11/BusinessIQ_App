# ADR-0002 Rwanda Launch and Currency Model

- Status: Accepted for product direction; detailed accounting/tax policy remains open, 2026-11-07
- Decision owners: Project owner, finance/accounting reviewer, and engineering lead

## Context

The project owner specified Rwanda as the initial launch market, RWF as the initial base currency, and `Africa/Kigali` as the initial timezone while requiring later country and currency expansion. Existing operational columns use a generic two-decimal “cents” convention, which is not a general currency model.

## Decision

New-business defaults target RW, RWF, and `Africa/Kigali`. Country, currency, timezone, tax jurisdiction, fiscal calendar, and rounding policy are business configuration. Do not embed Rwanda tax rules in shared calculations. Subscription billing currency remains separate from business operating currency.

Before changing stored amounts, design a migration that preserves old values and records currency precision and historical meaning. Posted foreign-currency transactions retain transaction currency, base-currency amount, exchange rate, rate source, and effective date; later rates do not rewrite history.

## Consequences and open work

- New organizations now persist a `currency_exponent` derived from their selected supported currency. RWF, UGX, XAF, and XOF are configured as zero-decimal currencies; the currently supported two-decimal currencies use exponent 2.
- Additive migration `5ec2a4b9d710` assigns exponent 2 to every existing organization. This preserves historical amount meaning and does not reinterpret posted rows when a legacy organization uses RWF.
- Operational integer amount columns remain encoded as hundredths of the major unit for compatibility. New writes for zero-decimal organizations must be multiples of 100, and tax rounds half-up to configured precision. This is an enforcement bridge, not completion of the SRS money model.
- Existing rows do not have per-transaction currency codes or exchange-rate snapshots. Multi-currency transactions, base-currency accounting, and historical FX support still require schema and migration design.
- Rwanda tax rates must be effective-dated configuration; legal interpretation and launch rules require qualified review.
- EBM/VSDC integration requires official protocol review and external approval; the application must not claim certification prematurely.

## Verification

Tests must cover currency precision, rounding, exchange-rate snapshots, allocation currency matching, tax effective dates, and preservation of historical posted values. Current helper and sale-math tests cover precision, zero-decimal rounding, and tax totals; database migration/backfill verification remains outstanding.
