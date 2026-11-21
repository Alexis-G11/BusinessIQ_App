# ADR-0003 Journal-Derived Financial Statements

- Status: Accepted for the current reporting increment; accounting-policy review remains open
- Date: 2026-11-07

## Context

BusinessIQ already posts operational transactions to double-entry journal entries. The first Reports screen instead recalculated profit from sales and expense records, omitted cost of goods sold, and treated revenue less expenses as cash flow. The SRS requires financial reports that reconcile to accounting records and identify their period, currency, and basis.

## Decision

- The income statement reads posted journal lines for an explicit inclusive date range. Account classes determine presentation; net revenue includes contra-revenue debits, COGS is debit-positive, and expenses are debit-positive. Calculations use `Decimal`.
- The balance sheet reads posted journal lines through an as-of date. Assets are debit-positive; liabilities and equity are credit-positive. Current earnings through that date are added to equity so the accounting equation can be tested before period-closing workflows exist.
- Both responses identify the organization currency, accrual basis, period/as-of date, and posted-journal source. They report the accounting equation difference and do not silently repair an imbalance.
- Cash-flow statements remain unavailable until cash accounts, cash equivalents, and operating/investing/financing classifications and reconciliation rules are defined. IAS 7 classifies cash flows into operating, investing, and financing activities; a simple `sales paid - expenses` calculation does not meet that classification model ([IFRS IAS 7 overview](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/)).

## Consequences and limits

- Reports share the backend authorization and organization context, and query only the selected organization's posted journal entries.
- The current chart does not model current/non-current presentation, comprehensive income, foreign currency, or accounting policies configurable by jurisdiction. The reports must not be represented as statutory statements or as compliance with a specific accounting standard until those policies receive qualified review.
- Pure arithmetic tests verify account-side signs, COGS, contra-revenue, current earnings, drawings, empty activity, and unbalanced data. Fake-session API tests verify date/tenant/status query scope and permission denial, but have not run on this host; live PostgreSQL tests remain required.
