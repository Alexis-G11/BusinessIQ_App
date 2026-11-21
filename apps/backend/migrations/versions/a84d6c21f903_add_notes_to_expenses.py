"""Add user notes to operational expenses.

Revision ID: a84d6c21f903
Revises: c92fa24d7e10
Create Date: 2026-11-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a84d6c21f903"
down_revision: Union[str, Sequence[str], None] = "c92fa24d7e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "notes")
