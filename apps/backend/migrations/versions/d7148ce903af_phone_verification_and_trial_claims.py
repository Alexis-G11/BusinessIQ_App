"""Require verified phone before starting a one-time trial."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d7148ce903af"
down_revision: Union[str, Sequence[str], None] = "c28f3a6e91b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS_TABLES = (
    "organizations",
    "users",
    "organization_users",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "product_categories",
    "products",
    "customers",
    "suppliers",
    "inventory_transactions",
    "sales",
    "sale_items",
    "purchases",
    "purchase_items",
    "expense_categories",
    "expenses",
    "payments",
    "payment_allocations",
    "accounts",
    "journal_entries",
    "journal_lines",
    "phone_trial_claims",
)


def upgrade() -> None:
    op.add_column("users", sa.Column("pending_phone_number", sa.String(), nullable=True))
    op.add_column("users", sa.Column("phone_verified_at", sa.DateTime(), nullable=True))
    op.create_unique_constraint("uq_users_phone_number", "users", ["phone_number"])
    op.create_table(
        "phone_trial_claims",
        sa.Column("phone_number", sa.String(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("claimed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("phone_number"),
        sa.UniqueConstraint("user_id", name="uq_phone_trial_claims_user_id"),
    )
    op.execute(
        """
        INSERT INTO phone_trial_claims (phone_number, user_id, claimed_at)
        SELECT phone_number, id, created_at
        FROM users
        WHERE phone_number IS NOT NULL AND btrim(phone_number) <> ''
        ON CONFLICT (phone_number) DO NOTHING
        """
    )
    op.execute(
        """
        CREATE SCHEMA businessiq_private;
        REVOKE ALL ON SCHEMA businessiq_private FROM PUBLIC;
        GRANT USAGE ON SCHEMA businessiq_private TO authenticated;

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
              AND account.phone_verified_at IS NOT NULL
              AND (
                organization.subscription_status = 'active'
                OR (
                  organization.subscription_status = 'trialing'
                  AND organization.trial_ends_at > (now() AT TIME ZONE 'UTC')
                )
              )
          );
        $$;
        REVOKE ALL ON FUNCTION businessiq_private.businessiq_has_feature_access(uuid) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION businessiq_private.businessiq_has_feature_access(uuid) TO authenticated;

        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_sale_item_access(target_sale_id uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1 FROM public.sales AS sale
            WHERE sale.id = target_sale_id
              AND businessiq_private.businessiq_has_feature_access(sale.organization_id)
          );
        $$;

        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_purchase_item_access(target_purchase_id uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1 FROM public.purchases AS purchase
            WHERE purchase.id = target_purchase_id
              AND businessiq_private.businessiq_has_feature_access(purchase.organization_id)
          );
        $$;

        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_payment_allocation_access(target_payment_id uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1 FROM public.payments AS payment
            WHERE payment.id = target_payment_id
              AND businessiq_private.businessiq_has_feature_access(payment.organization_id)
          );
        $$;

        CREATE OR REPLACE FUNCTION businessiq_private.businessiq_journal_line_access(target_entry_id uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = pg_catalog, public, auth
        AS $$
          SELECT EXISTS (
            SELECT 1 FROM public.journal_entries AS entry
            WHERE entry.id = target_entry_id
              AND businessiq_private.businessiq_has_feature_access(entry.organization_id)
          );
        $$;

        REVOKE ALL ON FUNCTION businessiq_private.businessiq_sale_item_access(uuid) FROM PUBLIC;
        REVOKE ALL ON FUNCTION businessiq_private.businessiq_purchase_item_access(uuid) FROM PUBLIC;
        REVOKE ALL ON FUNCTION businessiq_private.businessiq_payment_allocation_access(uuid) FROM PUBLIC;
        REVOKE ALL ON FUNCTION businessiq_private.businessiq_journal_line_access(uuid) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION businessiq_private.businessiq_sale_item_access(uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION businessiq_private.businessiq_purchase_item_access(uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION businessiq_private.businessiq_payment_allocation_access(uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION businessiq_private.businessiq_journal_line_access(uuid) TO authenticated;
        """
    )
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")

    organization_tables = (
        ("organizations", "id"),
        ("organization_users", "organization_id"),
        ("user_roles", "organization_id"),
        ("product_categories", "organization_id"),
        ("products", "organization_id"),
        ("customers", "organization_id"),
        ("suppliers", "organization_id"),
        ("inventory_transactions", "organization_id"),
        ("sales", "organization_id"),
        ("purchases", "organization_id"),
        ("expense_categories", "organization_id"),
        ("expenses", "organization_id"),
        ("payments", "organization_id"),
        ("accounts", "organization_id"),
        ("journal_entries", "organization_id"),
    )
    for table, organization_column in organization_tables:
        op.execute(
            f"""
            CREATE POLICY businessiq_entitlement_guard ON public.{table}
              AS RESTRICTIVE FOR ALL TO authenticated
              USING (businessiq_private.businessiq_has_feature_access({organization_column}))
              WITH CHECK (businessiq_private.businessiq_has_feature_access({organization_column}))
            """
        )

    child_access_functions = (
        ("sale_items", "businessiq_sale_item_access", "sale_id"),
        ("purchase_items", "businessiq_purchase_item_access", "purchase_id"),
        ("payment_allocations", "businessiq_payment_allocation_access", "payment_id"),
        ("journal_lines", "businessiq_journal_line_access", "journal_entry_id"),
    )
    for table, access_function, parent_id_column in child_access_functions:
        op.execute(
            f"""
            CREATE POLICY businessiq_entitlement_guard ON public.{table}
              AS RESTRICTIVE FOR ALL TO authenticated
              USING (businessiq_private.{access_function}({parent_id_column}))
              WITH CHECK (businessiq_private.{access_function}({parent_id_column}))
            """
        )


def downgrade() -> None:
    policy_tables = (
        "journal_lines",
        "payment_allocations",
        "purchase_items",
        "sale_items",
        "journal_entries",
        "accounts",
        "payments",
        "expenses",
        "expense_categories",
        "purchases",
        "sales",
        "inventory_transactions",
        "suppliers",
        "customers",
        "products",
        "product_categories",
        "user_roles",
        "organization_users",
        "organizations",
    )
    for table in policy_tables:
        op.execute(f"DROP POLICY businessiq_entitlement_guard ON public.{table}")
    for table in RLS_TABLES:
        if table != "phone_trial_claims":
            op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
    op.execute("DROP FUNCTION businessiq_private.businessiq_journal_line_access(uuid)")
    op.execute("DROP FUNCTION businessiq_private.businessiq_payment_allocation_access(uuid)")
    op.execute("DROP FUNCTION businessiq_private.businessiq_purchase_item_access(uuid)")
    op.execute("DROP FUNCTION businessiq_private.businessiq_sale_item_access(uuid)")
    op.execute("DROP FUNCTION businessiq_private.businessiq_has_feature_access(uuid)")
    op.execute("DROP SCHEMA businessiq_private")
    op.drop_table("phone_trial_claims")
    op.drop_constraint("uq_users_phone_number", "users", type_="unique")
    op.drop_column("users", "phone_verified_at")
    op.drop_column("users", "pending_phone_number")
