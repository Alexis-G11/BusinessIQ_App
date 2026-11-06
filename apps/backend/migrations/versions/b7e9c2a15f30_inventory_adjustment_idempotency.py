"""Make manual inventory adjustments replay-safe."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b7e9c2a15f30"
down_revision: Union[str, Sequence[str], None] = "a2f6d84c19b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("inventory_transactions", sa.Column("idempotency_key", sa.String(), nullable=True))
    op.add_column(
        "inventory_transactions",
        sa.Column("idempotency_request_hash", sa.String(length=64), nullable=True),
    )
    op.create_unique_constraint(
        "uq_inventory_org_idempotency", "inventory_transactions", ["organization_id", "idempotency_key"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_inventory_org_idempotency", "inventory_transactions", type_="unique")
    op.drop_column("inventory_transactions", "idempotency_request_hash")
    op.drop_column("inventory_transactions", "idempotency_key")
