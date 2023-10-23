from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_migrate import Migrate
from datetime import datetime

from recipe import generate_recipe
import pytz
import sys

from send_email import SendMail
from models import db, Product, Barcode, Queries

# Define the Pacific Time (PT) timezone
pt_timezone = pytz.timezone('US/Pacific')

app = Flask(__name__)
# Configure the SQLite database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

migrate = Migrate(app, db)
send_mail = SendMail(app, pt_timezone)

# Function to convert a datetime.datetime object to Pacific Time (PT)
def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)


@app.route('/', methods=['POST', 'GET'])
def index():
    current_date = datetime.now(pt_timezone).date()

    if request.method == 'POST':
        item_content = request.form['product-name']

        # Check if the "No Expiration Date" checkbox is checked
        no_expiration = 'no-expiration' in request.form

        if not no_expiration:
            expiration_date_str = request.form['expiration-date']
            item_expiration_datetime_utc = datetime.strptime(
                expiration_date_str, '%Y-%m-%d').replace(tzinfo=pytz.utc)

            item_expiration_datetime_pt = item_expiration_datetime_utc
            item_expiration_date = item_expiration_datetime_pt.date()

            if item_expiration_date <= current_date:
                return redirect(url_for('expired_date_input'))
        else:
            item_expiration_date = None  # No expiration date

        location = request.form['locations']
        category = request.form['category']
        barcode_number = request.form['barcode-number']
        barcode = Barcode.query.filter_by(barcode_value=barcode_number).first()

        if barcode is None:
            new_barcode = Barcode(
                barcode_value=barcode_number, barcode_item_name=item_content)
            db.session.add(new_barcode)
            db.session.commit()
            barcode = Barcode.query.filter_by(
                barcode_value=barcode_number).first()

        new_product = Product(
            product_name=item_content,
            expiration_date=item_expiration_date,
            barcode_id=barcode.id,
            location=location,
            category=category
        )
        db.session.add(new_product)
        db.session.commit()

        products = Product.query.filter_by(
            wasted_status=False).order_by(Product.date_created).all()
        current_date = datetime.now(pt_timezone)

        return redirect(url_for('index'))
    else:
        location_filter = request.args.get('location-filter', 'All')
        category_filter = request.args.get('category', 'All')
        expiration_date_filter = request.args.get('expiration-date', '')
        expiration_status_filter = request.args.get('expiration-status', 'all')

        query = Product.query.filter_by(wasted_status=False)

        if location_filter != 'All':
            query = query.filter_by(location=location_filter)
        if category_filter != 'All':
            query = query.filter_by(category=category_filter)
        if expiration_date_filter != '':
            query = query.filter(Product.expiration_date == expiration_date_filter)

        if expiration_status_filter == 'expired':
            query = query.filter(Product.expiration_date <= current_date)
        elif expiration_status_filter == 'not_expired':
            query = query.filter(Product.expiration_date > current_date)
        elif expiration_status_filter == 'not_expiring':
            query = query.filter(Product.expiration_date.is_(None))
        products = query.order_by(Product.date_created).all()

        # Format the expiration date or set it to "No Expiration Date"
        for product in products:
            if product.expiration_date:
                product.formatted_expiration_date = product.expiration_date.strftime('%b %d %Y')
            else:
                product.formatted_expiration_date = "No Expiration Date"

        return render_template("index.html", products=products, current_date=current_date.strftime('%Y-%m-%d'),
                               selected_location=location_filter, selected_category=category_filter,
                               selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)


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
        if product.expiration_date is not None and product.expiration_date <= current_date:
            # Handle the case when the product has a valid expiration date and it's expired
            expiration_status[product.id] = True
        else:
            # Handle the case when the product either has no expiration date or it's not expired
            expiration_status[product.id] = False

    print('expiration_status:', expiration_status)  # Add this line for debugging
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
    products = Product.query.filter_by(
        wasted_status=True).order_by(Product.date_created).all()
    return render_template("wasted_product_list.html", products=products)

@app.route('/get_products_data', methods=['GET'])
def get_products_data():
    products = Product.query.all()
    product_data = [{
        'product_name': product.product_name,
        'expiration_date': product.expiration_date.strftime('%Y-%m-%d'),
        'location': product.location,
        'category': product.category
    } for product in products]
    return jsonify({'products': product_data})

# Route for generating a recipe based on user input
@app.route('/generate_recipe', methods=['POST', 'GET'])
def generate_recipe_user_input():
    if request.method == 'POST':
        user_input = request.form.get('user-input')
        recipe_suggestion = generate_recipe([user_input])  # Assuming generate_recipe accepts a list
        return jsonify({'recipe_suggestion': recipe_suggestion})
    else:
        return render_template("generate_recipe.html")


@app.route('/generate_recipe_from_database', methods=['GET'])
def generate_recipe_from_database():
    recipe_suggestion = generate_recipe(Queries.get_all_product_names())
    return jsonify({'recipe_suggestion': recipe_suggestion})


def on_terminate(signal,frame):
    print("Received terminate signal at %s" % datetime.now())
    sys.exit(0)

send_mail.init_schedule_thread()

if __name__ == '__main__':
    # app.run(host='0.0.0.0', port=5000, debug=True, threaded=False)
    app.run(debug=True, port=8111)
