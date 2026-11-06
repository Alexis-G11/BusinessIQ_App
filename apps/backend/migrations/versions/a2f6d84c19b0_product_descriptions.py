"""Store product descriptions in the authoritative business database."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a2f6d84c19b0"
down_revision: Union[str, Sequence[str], None] = "d7148ce903af"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("idempotency_key", sa.String(), nullable=True))
    op.add_column("products", sa.Column("idempotency_request_hash", sa.String(length=64), nullable=True))
    op.create_unique_constraint(
        "uq_products_org_idempotency", "products", ["organization_id", "idempotency_key"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_products_org_idempotency", "products", type_="unique")
    op.drop_column("products", "idempotency_request_hash")
    op.drop_column("products", "idempotency_key")
    op.drop_column("products", "description")
