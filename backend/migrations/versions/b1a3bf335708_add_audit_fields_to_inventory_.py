from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1a3bf335708'
down_revision: Union[str, Sequence[str], None] = 'daacfffa3efa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inventory_transactions', sa.Column('created_by', sa.UUID(), nullable=True))
    op.add_column('inventory_transactions', sa.Column('reason', sa.String(), nullable=True))
    op.add_column('inventory_transactions', sa.Column('note', sa.Text(), nullable=True))
    op.create_foreign_key('inventory_transactions_created_by_fkey', 'inventory_transactions', 'users', ['created_by'], ['id'])
    op.create_index('ix_inventory_tx_org_product_created', 'inventory_transactions', ['organization_id', 'product_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_inventory_tx_org_product_created', table_name='inventory_transactions')
    op.drop_constraint('inventory_transactions_created_by_fkey', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'note')
    op.drop_column('inventory_transactions', 'reason')
    op.drop_column('inventory_transactions', 'created_by')
