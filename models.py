from flask import Flask
from datetime import datetime
import pytz

from flask_sqlalchemy import SQLAlchemy

pt_timezone = pytz.timezone('US/Pacific')

# Note: We'll be calling init_app on this later (check app.py).
db = SQLAlchemy()

# Create a Model
# Add more items:
# flask db migrate
# flask db upgrade
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    date_created = db.Column(
        db.DateTime, default=lambda: datetime.now(pt_timezone))
    date_wasted = db.Column(
        db.DateTime, default=lambda: datetime.now(pt_timezone))
    expiration_date = db.Column(db.Date)
    expiration_status = db.Column(db.Boolean, default=False)
    # Not Wasted = True and Wasted = False
    wasted_status = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(200), nullable=False, default='Food')
    # Add a foreign key relationship to the new table
    barcode_id = db.Column(db.Integer, db.ForeignKey('barcode.id'))
    barcode = db.relationship('Barcode', back_populates='products')

    # Create a string when a new element is created
    def __repr__(self):
        return f'<Product {self.id}>'


class Barcode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    barcode_value = db.Column(db.String(100), unique=True, nullable=False)
    barcode_item_name = db.Column(db.String(200))

    # Define a one-to-many relationship with the Product table
    products = db.relationship('Product', back_populates='barcode')

    def __repr__(self):
        return f'<Barcode {self.id}>'

class Queries:
    @classmethod
    def get_all_product_names(cls):
        products = Product.query.all()
        return [product.product_name for product in products]

