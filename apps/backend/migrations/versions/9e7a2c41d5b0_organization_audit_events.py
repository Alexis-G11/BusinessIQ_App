"""Add immutable organization audit events.

Revision ID: 9e7a2c41d5b0
Revises: c6e72b9a314f
Create Date: 2026-11-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9e7a2c41d5b0"
down_revision: Union[str, Sequence[str], None] = "c6e72b9a314f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("length(trim(action)) > 0", name="ck_organization_audit_events_action_nonempty"),
        sa.CheckConstraint("length(trim(target_type)) > 0", name="ck_organization_audit_events_target_nonempty"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_organization_audit_events_tenant_time",
        "organization_audit_events", ["organization_id", "occurred_at"],
    )
    op.execute("ALTER TABLE public.organization_audit_events ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY businessiq_entitlement_guard ON public.organization_audit_events
          AS RESTRICTIVE FOR ALL TO authenticated
          USING (businessiq_private.businessiq_has_feature_access(organization_id))
          WITH CHECK (businessiq_private.businessiq_has_feature_access(organization_id))
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION businessiq_private.reject_organization_audit_event_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = pg_catalog
        AS $$
        BEGIN
            RAISE EXCEPTION 'organization audit events are immutable';
        END;
        $$;
        CREATE TRIGGER organization_audit_events_immutable
          BEFORE UPDATE OR DELETE ON public.organization_audit_events
          FOR EACH ROW EXECUTE FUNCTION businessiq_private.reject_organization_audit_event_mutation();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER organization_audit_events_immutable ON public.organization_audit_events")
    op.execute("DROP FUNCTION businessiq_private.reject_organization_audit_event_mutation()")
    op.execute("DROP POLICY businessiq_entitlement_guard ON public.organization_audit_events")
    op.execute("ALTER TABLE public.organization_audit_events DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_organization_audit_events_tenant_time", table_name="organization_audit_events")
    op.drop_table("organization_audit_events")
