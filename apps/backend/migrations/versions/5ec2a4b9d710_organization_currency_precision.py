"""Persist configured operating-currency precision per organization.

Revision ID: 5ec2a4b9d710
Revises: a84d6c21f903
Create Date: 2026-11-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5ec2a4b9d710"
down_revision: Union[str, Sequence[str], None] = "a84d6c21f903"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing integer amounts have historically meant hundredths of a major
    # unit. Keep that interpretation for every existing organization, including
    # organizations whose currency is RWF or another zero-decimal currency.
    op.add_column(
        "organizations",
        sa.Column("currency_exponent", sa.Integer(), nullable=False, server_default="2"),
    )
    op.create_check_constraint(
        "ck_organizations_currency_exponent",
        "organizations",
        "currency_exponent BETWEEN 0 AND 2",
    )


def downgrade() -> None:
    op.drop_constraint("ck_organizations_currency_exponent", "organizations", type_="check")
    op.drop_column("organizations", "currency_exponent")
