from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime
import pytz

app = Flask(__name__)

# Configure the SQLite database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'

# Initialize the database with the settings from our app
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Define the Pacific Time (PT) timezone
pt_timezone = pytz.timezone('US/Pacific')


# Function to convert a datetime.datetime object to Pacific Time (PT)
def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)

# Create a Model
# Add more items:
# flask db migrate
# flask db upgrade
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    date_created = db.Column(db.DateTime, default=lambda: datetime.now(pt_timezone))
    date_wasted = db.Column(db.DateTime, default=lambda: datetime.now(pt_timezone))
    expiration_date = db.Column(db.Date)
    expiration_status = db.Column(db.Boolean, default=False)
    # Not Wasted = True and Wasted = False
    wasted_status = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(200), nullable=False)
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


# Route to display the index page
@app.route('/', methods=['POST', 'GET'])
def index():
    if request.method == 'POST':
        item_content = request.form['product-name']
        # Get the expiration date as a string
        expiration_date_str = request.form['expiration-date']
        # Convert expiration_date_str to a datetime object in UTC
        item_expiration_datetime_utc = datetime.strptime(expiration_date_str, '%Y-%m-%d').replace(tzinfo=pytz.utc)

        # Convert item_expiration_datetime_utc to Pacific Time (PT)
        item_expiration_datetime_pt = item_expiration_datetime_utc
        # Extract the date part for item_expiration_date
        item_expiration_date = item_expiration_datetime_pt.date()
        
         # Get the location from the form data
        location = request.form['locations']
        
        barcode_number = request.form['barcode-number']
        barcode = Barcode.query.filter_by(barcode_value=barcode_number).first()
        current_date = datetime.now(pt_timezone).date()
        # Check if the item has already expired
        if item_expiration_date <= current_date:
            return redirect(url_for('expired_date_input'))

        if barcode is None:
            # Add a new barcode if it doesn't exist in the database
            new_barcode = Barcode(barcode_value=barcode_number, barcode_item_name=item_content)
            db.session.add(new_barcode)
            db.session.commit()
            barcode = Barcode.query.filter_by(barcode_value=barcode_number).first()

        # Create a new product and associate it with the barcode
        new_product = Product(
            product_name=item_content, 
            expiration_date=item_expiration_date, 
            barcode_id=barcode.id,
            location=location
        )
        db.session.add(new_product)
        db.session.commit()

        # Fetch the updated list of products
        products = Product.query.filter_by(wasted_status=False).order_by(Product.date_created).all()
        current_date = datetime.now(pt_timezone)

        return redirect(url_for('index'))

    else:
        # Display the list of products on the index page
        products = Product.query.filter_by(wasted_status=False).order_by(Product.date_created).all()
        current_date = datetime.now(pt_timezone)
        return render_template("index.html", products=products, current_date=current_date.strftime('%Y-%m-%d'))


# Route to check if a barcode exists
@app.route('/check_barcode', methods=['POST'])
def check_barcode():
    try:
        data = request.json
        barcode_value = data.get('barcode')

        # Query the Barcode table to check if the scanned barcode exists
        barcode = Barcode.query.filter_by(barcode_value=barcode_value).first()

        if barcode:
            # If the barcode exists, return the product name
            return jsonify({'exists': True, 'productName': barcode.barcode_item_name})
        else:
            return jsonify({'exists': False})

    except Exception as e:
        return jsonify({'error': str(e)})


# Route to add a new barcode
@app.route('/add_barcode', methods=['POST'])
def add_barcode():
    try:
        item_name = request.form['barcode-item-name']
        barcode_number = request.form['barcode-number']

        # Create a new Barcode instance and add it to the database
        new_item = Barcode(barcode_value=barcode_number,
                           barcode_item_name=item_name)
        db.session.add(new_item)
        db.session.commit()
        return redirect('/')
    except Exception as e:
        return jsonify({'error': str(e)})


# Route to update the expiration status of products
@app.route('/check_expiration_status')
def check_expiration_status():
    products = Product.query.all()
# Get the current date and time in Pacific Time (PT)
    current_date = datetime.now(pt_timezone).date()
    # Create a dictionary to store the expiration status of each product
    expiration_status = {}
    for product in products:
        if product.expiration_date <= current_date:
            expiration_status[product.id] = True
        else:
            expiration_status[product.id] = False
    return jsonify(expiration_status)


# Route to handle expired date input
@app.route('/expired_date_input', methods=['POST'])
def expired_date_input():
    try:
        # Get the expiration date as a string from the form data
        expiration_date_str = request.form['expiration-date']
        # Convert the expiration date string to a Python date object
        item_expiration_date = datetime.utcnow().strptime(
            expiration_date_str, '%Y-%m-%d').date()
        current_date = datetime.now(pt_timezone).date()
        # Check if the item's expiration date is not valid
        if item_expiration_date <= current_date:
            return jsonify({'valid': False})

        # Handle the case when the expiration date is valid
        return jsonify({'valid': True})

    except Exception as e:
        return jsonify({'error': str(e)})


# Route to update a product's information
@app.route('/update_product/<int:id>', methods=['GET', 'POST'])
def update_product(id):
    update_product = Product.query.get_or_404(id)

    if request.method == 'POST':
        update_product.product_name = request.form['product-name']
        expiration_date_str = request.form['expiration-date']
        expiration_date = datetime.strptime(
            expiration_date_str, '%Y-%m-%d').date()  # Convert to Python date object
        update_product.expiration_date = expiration_date
        try:
            db.session.commit()
            return redirect('/')

        except Exception as e:
            return jsonify({'error': str(e)})
    else:
        return render_template('update_product.html', product=update_product)


# Route to delete a product
@app.route('/delete_product/<int:id>')
def delete_product(id):
    delete_product = Product.query.get_or_404(id)

    try:
        db.session.delete(delete_product)
        db.session.commit()
        # Redirect to the previous page
        return redirect(request.referrer)
    except Exception as e:
        return jsonify({'error': str(e)})


# Route to mark a product as wasted
@app.route('/waste_product/<int:id>')
def waste_product(id):
    waste_product = Product.query.get_or_404(id)
    waste_product.wasted_status = True
    try:
        db.session.add(waste_product)
        db.session.commit()
        return redirect('/')
    except Exception as e:
        return jsonify({'error': str(e)})


# Route to diplay the wasted products in the wasted product list
@app.route('/wasted_product_list', methods=['GET', 'POST'])
def wasted_product_list():
    products = Product.query.filter_by(wasted_status=True).order_by(Product.date_created).all()
    return render_template("wasted_product_list.html", products=products)


@app.route('/get_products_data', methods=['GET'])
def get_products_data():
    products = Product.query.all()
    product_data = [{
        'product_name': product.product_name,
        'expiration_date': product.expiration_date.strftime('%Y-%m-%d'),
        'location': product.location
    } for product in products]
    return jsonify({'products': product_data})


if __name__ == '__main__':
    # app.run(debug=True, port=8080)
    app.run(host='192.168.1.28', port=5000, debug=True, threaded=False)

