"""Record organization trial start and eligibility decision."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "c92fa24d7e10"
down_revision: Union[str, Sequence[str], None] = "b7e9c2a15f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("trial_started_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        """
        UPDATE organizations
        SET trial_started_at = trial_ends_at - INTERVAL '7 days'
        WHERE subscription_status = 'trialing'
          AND trial_ends_at IS NOT NULL
          AND trial_started_at IS NULL
        """
    )
    op.create_table(
        "organization_trial_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decided_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decision", sa.String(), nullable=False),
        sa.Column("decision_reason", sa.String(), nullable=False),
        sa.Column("abuse_signals", postgresql.JSONB(), nullable=False),
        sa.Column("decided_at", sa.DateTime(), nullable=False),
        sa.Column("trial_started_at", sa.DateTime(), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_trial_decisions_org_decided_at", "organization_id", "decided_at"),
        sa.CheckConstraint("decision IN ('eligible', 'denied')", name="ck_trial_decisions_decision"),
        sa.CheckConstraint("jsonb_typeof(abuse_signals) = 'array'", name="ck_trial_decisions_signals_array"),
        sa.CheckConstraint(
            "trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at",
            name="ck_trial_decisions_trial_window_order",
        ),
    )
    op.create_check_constraint(
        "ck_organizations_trial_window_order",
        "organizations",
        "trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at",
    )
    # The API's database service role writes these records. Authenticated
    # Supabase clients receive no direct policy on this internal decision log.
    op.execute("ALTER TABLE public.organization_trial_decisions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        INSERT INTO organization_trial_decisions (
            id, organization_id, decided_by_user_id, decision, decision_reason,
            abuse_signals, decided_at, trial_started_at, trial_ends_at
        )
        SELECT gen_random_uuid(), organization.id, membership.user_id,
               'eligible', 'backfilled_existing_trial', '[]'::jsonb,
               organization.trial_started_at, organization.trial_started_at,
               organization.trial_ends_at
        FROM organizations AS organization
        JOIN LATERAL (
            SELECT organization_user.user_id
            FROM organization_users AS organization_user
            WHERE organization_user.organization_id = organization.id
              AND organization_user.is_owner
            ORDER BY organization_user.created_at, organization_user.id
            LIMIT 1
        ) AS membership ON true
        WHERE organization.subscription_status = 'trialing'
          AND organization.trial_started_at IS NOT NULL
          AND organization.trial_ends_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.organization_trial_decisions DISABLE ROW LEVEL SECURITY")
    op.drop_table("organization_trial_decisions")
    op.drop_constraint("ck_organizations_trial_window_order", "organizations", type_="check")
    op.drop_column("organizations", "trial_started_at")
