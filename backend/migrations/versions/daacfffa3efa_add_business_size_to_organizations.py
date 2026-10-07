"""add business_size to organizations

Revision ID: daacfffa3efa
Revises: d5bfdee8cf81
Create Date: 2026-10-06 23:04:01.649530

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'daacfffa3efa'
down_revision: Union[str, Sequence[str], None] = 'd5bfdee8cf81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('business_size', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('organizations', 'business_size')
