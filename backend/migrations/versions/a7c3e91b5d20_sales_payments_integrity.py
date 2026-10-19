"""sales, payments and integrity upgrades

Revision ID: a7c3e91b5d20
Revises: b1a3bf335708
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a7c3e91b5d20'
down_revision: Union[str, None] = 'b1a3bf335708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- organizations: per-business sales tax in basis points (800 = 8.00%) ---
    op.add_column('organizations', sa.Column('tax_rate_bps', sa.Integer(), nullable=False, server_default='0'))
    op.create_check_constraint('ck_org_tax_rate_range', 'organizations', 'tax_rate_bps >= 0 AND tax_rate_bps <= 10000')

    # --- sales: receipt number, dates, discount, tax, payment status, who made it ---
    op.add_column('sales', sa.Column('reference', sa.String(), nullable=True))
    op.add_column('sales', sa.Column('sale_date', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')))
    op.add_column('sales', sa.Column('subtotal_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('sales', sa.Column('discount_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('sales', sa.Column('tax_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('sales', sa.Column('amount_paid_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('sales', sa.Column('payment_status', sa.String(), nullable=False, server_default='paid'))
    op.add_column('sales', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('sales', sa.Column('created_by', sa.UUID(), nullable=True))
    op.create_foreign_key('sales_created_by_fkey', 'sales', 'users', ['created_by'], ['id'])
    op.create_unique_constraint('uq_sales_org_reference', 'sales', ['organization_id', 'reference'])
    op.create_check_constraint('ck_sales_status_valid', 'sales', "status in ('completed','refunded','voided')")
    op.create_check_constraint('ck_sales_payment_status_valid', 'sales', "payment_status in ('paid','partial','unpaid')")
    op.create_check_constraint(
        'ck_sales_amounts', 'sales',
        'subtotal_cents >= 0 AND discount_cents >= 0 AND discount_cents <= subtotal_cents '
        'AND tax_cents >= 0 AND total_cents = subtotal_cents - discount_cents + tax_cents '
        'AND amount_paid_cents >= 0 AND amount_paid_cents <= total_cents',
    )
    op.create_index('ix_sales_org_date', 'sales', ['organization_id', 'sale_date'])
    op.create_index('ix_sales_org_customer', 'sales', ['organization_id', 'customer_id'])

    # --- sale_items: product name at time of sale, sanity checks, indexes ---
    op.add_column('sale_items', sa.Column('product_name', sa.String(), nullable=False, server_default=''))
    op.create_check_constraint('ck_sale_items_valid', 'sale_items', 'quantity > 0 AND unit_price_cents >= 0 AND unit_cost_cents >= 0')
    op.create_index('ix_sale_items_sale', 'sale_items', ['sale_id'])
    op.create_index('ix_sale_items_product', 'sale_items', ['product_id'])

    # --- payments: customer, who, note, business date; idempotency key unique PER BUSINESS ---
    op.add_column('payments', sa.Column('customer_id', sa.UUID(), nullable=True))
    op.add_column('payments', sa.Column('created_by', sa.UUID(), nullable=True))
    op.add_column('payments', sa.Column('note', sa.Text(), nullable=True))
    op.add_column('payments', sa.Column('payment_date', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')))
    op.create_foreign_key('payments_customer_id_fkey', 'payments', 'customers', ['customer_id'], ['id'])
    op.create_foreign_key('payments_created_by_fkey', 'payments', 'users', ['created_by'], ['id'])
    op.execute('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_idempotency_key_key')
    op.create_unique_constraint('uq_payments_org_idempotency', 'payments', ['organization_id', 'idempotency_key'])
    op.create_check_constraint('ck_payments_valid', 'payments', "amount_cents > 0 AND direction in ('in','out')")
    op.create_check_constraint('ck_payment_allocations_amount', 'payment_allocations', 'amount_cents > 0')
    op.create_index('ix_payment_allocations_ref', 'payment_allocations', ['reference_type', 'reference_id'])
    op.create_index('ix_payment_allocations_payment', 'payment_allocations', ['payment_id'])

    # --- ledger: entry numbers unique per business ---
    op.create_unique_constraint('uq_journal_entries_org_number', 'journal_entries', ['organization_id', 'entry_number'])
    op.create_index('ix_journal_entries_org_date', 'journal_entries', ['organization_id', 'entry_date'])

    # --- catalog integrity promised earlier: the database now enforces what the API already checks ---
    op.create_index('uq_products_org_sku', 'products', ['organization_id', 'sku'], unique=True, postgresql_where=sa.text('sku IS NOT NULL'))
    op.create_index('uq_product_categories_org_name', 'product_categories', ['organization_id', sa.text('lower(name)')], unique=True)
    op.create_index('uq_suppliers_org_name', 'suppliers', ['organization_id', sa.text('lower(name)')], unique=True)
    op.create_index('uq_customers_org_phone', 'customers', ['organization_id', 'phone'], unique=True, postgresql_where=sa.text('phone IS NOT NULL'))


def downgrade() -> None:
    op.drop_index('uq_customers_org_phone', table_name='customers')
    op.drop_index('uq_suppliers_org_name', table_name='suppliers')
    op.drop_index('uq_product_categories_org_name', table_name='product_categories')
    op.drop_index('uq_products_org_sku', table_name='products')

    op.drop_index('ix_journal_entries_org_date', table_name='journal_entries')
    op.drop_constraint('uq_journal_entries_org_number', 'journal_entries', type_='unique')

    op.drop_index('ix_payment_allocations_payment', table_name='payment_allocations')
    op.drop_index('ix_payment_allocations_ref', table_name='payment_allocations')
    op.drop_constraint('ck_payment_allocations_amount', 'payment_allocations', type_='check')
    op.drop_constraint('ck_payments_valid', 'payments', type_='check')
    op.drop_constraint('uq_payments_org_idempotency', 'payments', type_='unique')
    op.create_unique_constraint('payments_idempotency_key_key', 'payments', ['idempotency_key'])
    op.drop_constraint('payments_created_by_fkey', 'payments', type_='foreignkey')
    op.drop_constraint('payments_customer_id_fkey', 'payments', type_='foreignkey')
    op.drop_column('payments', 'payment_date')
    op.drop_column('payments', 'note')
    op.drop_column('payments', 'created_by')
    op.drop_column('payments', 'customer_id')

    op.drop_index('ix_sale_items_product', table_name='sale_items')
    op.drop_index('ix_sale_items_sale', table_name='sale_items')
    op.drop_constraint('ck_sale_items_valid', 'sale_items', type_='check')
    op.drop_column('sale_items', 'product_name')

    op.drop_index('ix_sales_org_customer', table_name='sales')
    op.drop_index('ix_sales_org_date', table_name='sales')
    op.drop_constraint('ck_sales_amounts', 'sales', type_='check')
    op.drop_constraint('ck_sales_payment_status_valid', 'sales', type_='check')
    op.drop_constraint('ck_sales_status_valid', 'sales', type_='check')
    op.drop_constraint('uq_sales_org_reference', 'sales', type_='unique')
    op.drop_constraint('sales_created_by_fkey', 'sales', type_='foreignkey')
    op.drop_column('sales', 'created_by')
    op.drop_column('sales', 'notes')
    op.drop_column('sales', 'payment_status')
    op.drop_column('sales', 'amount_paid_cents')
    op.drop_column('sales', 'tax_cents')
    op.drop_column('sales', 'discount_cents')
    op.drop_column('sales', 'subtotal_cents')
    op.drop_column('sales', 'sale_date')
    op.drop_column('sales', 'reference')

    op.drop_constraint('ck_org_tax_rate_range', 'organizations', type_='check')
    op.drop_column('organizations', 'tax_rate_bps')
