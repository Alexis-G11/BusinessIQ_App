"""Add revocable business memberships and append-only lifecycle events.

Revision ID: c6e72b9a314f
Revises: f4b91d6a2e73
Create Date: 2026-11-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c6e72b9a314f"
down_revision: Union[str, Sequence[str], None] = "f4b91d6a2e73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organization_users", sa.Column("revoked_at", sa.DateTime(), nullable=True))
    op.add_column("organization_users", sa.Column("revoked_by_user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_organization_users_revoked_by_user_id_users",
        "organization_users", "users", ["revoked_by_user_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_organization_users_revocation_actor",
        "organization_users",
        "(revoked_at IS NULL AND revoked_by_user_id IS NULL) OR "
        "(revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)",
    )
    # The existing entitlement RLS helper must stop authorizing a member after
    # their organization_users row has been revoked.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_has_feature_access(target_organization_id uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1
            FROM public.organization_users AS membership
            JOIN public.users AS account ON account.id = membership.user_id
            JOIN public.organizations AS organization ON organization.id = membership.organization_id
            WHERE membership.organization_id = target_organization_id
              AND membership.user_id = auth.uid()
              AND membership.revoked_at IS NULL
              AND account.phone_verified_at IS NOT NULL
              AND (
                organization.subscription_status = 'active'
                OR (organization.subscription_status = 'trialing'
                    AND organization.trial_ends_at > (now() AT TIME ZONE 'UTC'))
              )
          );
        $$;
        """
    )
    op.create_table(
        "organization_membership_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("membership_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("previous_role_id", sa.Uuid(), nullable=True),
        sa.Column("new_role_id", sa.Uuid(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(
            "event_type IN ('created', 'reinstated', 'role_changed', 'revoked')",
            name="ck_organization_membership_events_event_type",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["membership_id"], ["organization_users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["previous_role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["new_role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_organization_membership_events_tenant_time",
        "organization_membership_events", ["organization_id", "occurred_at"],
    )
    op.execute("ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.organization_membership_events ENABLE ROW LEVEL SECURITY")
    for table in ("organization_invitations", "organization_membership_events"):
        op.execute(
            f"""
            CREATE POLICY businessiq_entitlement_guard ON public.{table}
              AS RESTRICTIVE FOR ALL TO authenticated
              USING (businessiq_private.businessiq_has_feature_access(organization_id))
              WITH CHECK (businessiq_private.businessiq_has_feature_access(organization_id))
            """
        )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION businessiq_private.reject_membership_event_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = pg_catalog
        AS $$
        BEGIN
            RAISE EXCEPTION 'organization membership events are immutable';
        END;
        $$;
        CREATE TRIGGER organization_membership_events_immutable
          BEFORE UPDATE OR DELETE ON public.organization_membership_events
          FOR EACH ROW EXECUTE FUNCTION businessiq_private.reject_membership_event_mutation();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER organization_membership_events_immutable ON public.organization_membership_events")
    op.execute("DROP FUNCTION businessiq_private.reject_membership_event_mutation()")
    for table in ("organization_membership_events", "organization_invitations"):
        op.execute(f"DROP POLICY businessiq_entitlement_guard ON public.{table}")
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_organization_membership_events_tenant_time", table_name="organization_membership_events")
    op.drop_table("organization_membership_events")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_has_feature_access(target_organization_id uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1
            FROM public.organization_users AS membership
            JOIN public.users AS account ON account.id = membership.user_id
            JOIN public.organizations AS organization ON organization.id = membership.organization_id
            WHERE membership.organization_id = target_organization_id
              AND membership.user_id = auth.uid()
              AND account.phone_verified_at IS NOT NULL
              AND (
                organization.subscription_status = 'active'
                OR (organization.subscription_status = 'trialing'
                    AND organization.trial_ends_at > (now() AT TIME ZONE 'UTC'))
              )
          );
        $$;
        """
    )
    op.drop_constraint("ck_organization_users_revocation_actor", "organization_users", type_="check")
    op.drop_constraint("fk_organization_users_revoked_by_user_id_users", "organization_users", type_="foreignkey")
    op.drop_column("organization_users", "revoked_by_user_id")
    op.drop_column("organization_users", "revoked_at")
