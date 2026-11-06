"""Enforce unique business memberships and role assignments.

Revision ID: c28f3a6e91b4
Revises: ab72c4519e60
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c28f3a6e91b4"
down_revision: Union[str, Sequence[str], None] = "ab72c4519e60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_organization_users_org_user",
        "organization_users",
        ["organization_id", "user_id"],
    )
    op.create_unique_constraint(
        "uq_user_roles_org_user",
        "user_roles",
        ["organization_id", "user_id"],
    )
    op.create_unique_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        ["role_id", "permission_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        type_="unique",
    )
    op.drop_constraint(
        "uq_user_roles_org_user",
        "user_roles",
        type_="unique",
    )
    op.drop_constraint(
        "uq_organization_users_org_user",
        "organization_users",
        type_="unique",
    )
