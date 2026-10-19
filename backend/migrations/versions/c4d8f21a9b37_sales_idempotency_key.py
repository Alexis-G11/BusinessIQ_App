"""sales idempotency key

Revision ID: c4d8f21a9b37
Revises: a7c3e91b5d20
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c4d8f21a9b37'
down_revision: Union[str, None] = 'a7c3e91b5d20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('idempotency_key', sa.String(), nullable=True))
    op.create_unique_constraint('uq_sales_org_idempotency', 'sales', ['organization_id', 'idempotency_key'])


def downgrade() -> None:
    op.drop_constraint('uq_sales_org_idempotency', 'sales', type_='unique')
    op.drop_column('sales', 'idempotency_key')
