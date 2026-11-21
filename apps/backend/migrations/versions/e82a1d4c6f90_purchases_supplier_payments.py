"""purchases, supplier payments and payable tracking

Revision ID: e82a1d4c6f90
Revises: daacfffa3efa
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e82a1d4c6f90"
down_revision: Union[str, Sequence[str], None] = "daacfffa3efa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = "a7c3e91b5d20"


def upgrade() -> None:
    op.add_column("purchases", sa.Column("reference", sa.String(), nullable=True))
    op.add_column(
        "purchases",
        sa.Column("purchase_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
    )
    op.add_column(
        "purchases",
        sa.Column("amount_paid_cents", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("purchases", sa.Column("idempotency_key", sa.String(), nullable=True))
    op.add_column("purchases", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("purchases", sa.Column("created_by", sa.UUID(), nullable=True))
    op.create_foreign_key("purchases_created_by_fkey", "purchases", "users", ["created_by"], ["id"])

    op.execute(
        """
        UPDATE purchases AS p
        SET reference = numbered.reference
        FROM (
            SELECT id, 'P-' || lpad(
                row_number() OVER (PARTITION BY organization_id ORDER BY created_at, id)::text,
                6, '0'
            ) AS reference
            FROM purchases
        ) AS numbered
        WHERE p.id = numbered.id
        """
    )
    op.alter_column("purchases", "reference", nullable=False)
    op.create_unique_constraint("uq_purchases_org_reference", "purchases", ["organization_id", "reference"])
    op.create_unique_constraint("uq_purchases_org_idempotency", "purchases", ["organization_id", "idempotency_key"])
    op.create_check_constraint(
        "ck_purchases_status_valid",
        "purchases",
        "status in ('ordered','received','cancelled')",
    )
    op.create_check_constraint(
        "ck_purchases_amounts",
        "purchases",
        "total_cents >= 0 AND amount_paid_cents >= 0 AND amount_paid_cents <= total_cents",
    )
    op.execute(
        "ALTER TABLE purchases ADD CONSTRAINT ck_purchases_credit_supplier "
        "CHECK (amount_paid_cents = total_cents OR supplier_id IS NOT NULL) NOT VALID"
    )
    op.create_check_constraint(
        "ck_purchase_items_valid",
        "purchase_items",
        "quantity > 0 AND unit_cost_cents >= 0",
    )
    op.create_index("ix_purchases_org_date", "purchases", ["organization_id", "purchase_date"])
    op.create_index("ix_purchases_org_supplier", "purchases", ["organization_id", "supplier_id"])
    op.create_index("ix_purchase_items_purchase", "purchase_items", ["purchase_id"])

    op.add_column("payments", sa.Column("supplier_id", sa.UUID(), nullable=True))
    op.create_foreign_key("payments_supplier_id_fkey", "payments", "suppliers", ["supplier_id"], ["id"])
    op.create_check_constraint(
        "ck_payments_one_counterparty",
        "payments",
        "customer_id IS NULL OR supplier_id IS NULL",
    )
    op.create_check_constraint(
        "ck_payments_counterparty_direction",
        "payments",
        "(customer_id IS NULL OR direction = 'in') AND (supplier_id IS NULL OR direction = 'out')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_payments_counterparty_direction", "payments", type_="check")
    op.drop_constraint("ck_payments_one_counterparty", "payments", type_="check")
    op.drop_constraint("payments_supplier_id_fkey", "payments", type_="foreignkey")
    op.drop_column("payments", "supplier_id")

    op.drop_index("ix_purchase_items_purchase", table_name="purchase_items")
    op.drop_index("ix_purchases_org_supplier", table_name="purchases")
    op.drop_index("ix_purchases_org_date", table_name="purchases")
    op.drop_constraint("ck_purchase_items_valid", "purchase_items", type_="check")
    op.drop_constraint("ck_purchases_credit_supplier", "purchases", type_="check")
    op.drop_constraint("ck_purchases_amounts", "purchases", type_="check")
    op.drop_constraint("ck_purchases_status_valid", "purchases", type_="check")
    op.drop_constraint("uq_purchases_org_idempotency", "purchases", type_="unique")
    op.drop_constraint("uq_purchases_org_reference", "purchases", type_="unique")
    op.drop_constraint("purchases_created_by_fkey", "purchases", type_="foreignkey")
    op.drop_column("purchases", "created_by")
    op.drop_column("purchases", "note")
    op.drop_column("purchases", "idempotency_key")
    op.drop_column("purchases", "amount_paid_cents")
    op.drop_column("purchases", "purchase_date")
    op.drop_column("purchases", "reference")
