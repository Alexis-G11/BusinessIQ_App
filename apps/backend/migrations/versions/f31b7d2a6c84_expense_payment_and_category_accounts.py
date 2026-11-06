"""expense payment state and category account mapping

Revision ID: f31b7d2a6c84
Revises: e82a1d4c6f90
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f31b7d2a6c84"
down_revision: Union[str, Sequence[str], None] = "e82a1d4c6f90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("expense_categories", sa.Column("account_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "expense_categories_account_id_fkey",
        "expense_categories",
        "accounts",
        ["account_id"],
        ["id"],
    )
    op.execute(
        """
        UPDATE expense_categories AS category
        SET account_id = account.id
        FROM accounts AS account
        WHERE account.organization_id = category.organization_id
          AND account.account_code = CASE lower(category.name)
              WHEN 'rent' THEN '6000'
              WHEN 'payroll' THEN '6100'
              WHEN 'salaries' THEN '6100'
              WHEN 'utilities' THEN '6200'
              WHEN 'supplies' THEN '6300'
              ELSE '6900'
          END
        """
    )
    op.execute(
        """
        UPDATE expense_categories AS category
        SET account_id = account.id
        FROM accounts AS account
        WHERE category.account_id IS NULL
          AND account.organization_id = category.organization_id
          AND account.account_code = '6900'
        """
    )
    op.alter_column("expense_categories", "account_id", nullable=False)
    op.create_index(
        "uq_expense_categories_org_name",
        "expense_categories",
        ["organization_id", sa.text("lower(name)")],
        unique=True,
    )

    op.add_column(
        "expenses",
        sa.Column("amount_paid_cents", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE expenses SET amount_paid_cents = amount_cents")
    op.add_column("expenses", sa.Column("idempotency_key", sa.String(), nullable=True))
    op.add_column("expenses", sa.Column("created_by", sa.UUID(), nullable=True))
    op.create_foreign_key("expenses_created_by_fkey", "expenses", "users", ["created_by"], ["id"])
    op.create_unique_constraint(
        "uq_expenses_org_idempotency",
        "expenses",
        ["organization_id", "idempotency_key"],
    )
    op.create_check_constraint(
        "ck_expenses_amounts",
        "expenses",
        "amount_cents > 0 AND amount_paid_cents >= 0 AND amount_paid_cents <= amount_cents",
    )
    op.create_check_constraint(
        "ck_expenses_credit_supplier",
        "expenses",
        "amount_paid_cents = amount_cents OR supplier_id IS NOT NULL",
    )
    op.create_index("ix_expenses_org_date", "expenses", ["organization_id", "incurred_at"])
    op.create_index("ix_expenses_org_supplier", "expenses", ["organization_id", "supplier_id"])


def downgrade() -> None:
    op.drop_index("ix_expenses_org_supplier", table_name="expenses")
    op.drop_index("ix_expenses_org_date", table_name="expenses")
    op.drop_constraint("ck_expenses_credit_supplier", "expenses", type_="check")
    op.drop_constraint("ck_expenses_amounts", "expenses", type_="check")
    op.drop_constraint("uq_expenses_org_idempotency", "expenses", type_="unique")
    op.drop_constraint("expenses_created_by_fkey", "expenses", type_="foreignkey")
    op.drop_column("expenses", "created_by")
    op.drop_column("expenses", "idempotency_key")
    op.drop_column("expenses", "amount_paid_cents")

    op.drop_index("uq_expense_categories_org_name", table_name="expense_categories")
    op.drop_constraint("expense_categories_account_id_fkey", "expense_categories", type_="foreignkey")
    op.drop_column("expense_categories", "account_id")
