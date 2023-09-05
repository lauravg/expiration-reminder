"""empty message

Revision ID: a34c965b49d8
Revises: 16e4cc95b53f
Create Date: 2023-09-02 18:22:58.078541

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a34c965b49d8'
down_revision = '16e4cc95b53f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.add_column(sa.Column('active_status', sa.Boolean(), nullable=True))
        batch_op.drop_column('status')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.BOOLEAN(), nullable=True))
        batch_op.drop_column('active_status')

    # ### end Alembic commands ###