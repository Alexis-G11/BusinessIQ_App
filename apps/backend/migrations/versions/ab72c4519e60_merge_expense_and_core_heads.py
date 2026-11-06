"""Merge the core schema and expense feature migration branches.

Revision ID: ab72c4519e60
Revises: c4d8f21a9b37, f31b7d2a6c84
Create Date: 2026-10-29
"""
from typing import Sequence, Union

revision: str = "ab72c4519e60"
down_revision: Union[str, Sequence[str], None] = ("c4d8f21a9b37", "f31b7d2a6c84")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
