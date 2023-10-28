from functools import wraps
import secrets
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_migrate import Migrate
from datetime import datetime
from config import pt_timezone

from recipe import generate_recipe
import pytz
import sys

from send_email import SendMail
import firebase_admin
from firebase_admin import credentials, auth
from firebase_admin import db as firebase_db

firebaseConfig = {
  
};

cred = credentials.Certificate(
    'pantryguardian-f8381-f7d96ae72f46.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://pantryguardian-f8381-default-rtdb.firebaseio.com'
})

app = Flask(__name__)

secret_key = secrets.token_urlsafe(16)
app.secret_key = secret_key

send_mail = SendMail(app, app, pt_timezone)

def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        try:
            user = auth.create_user(
                email=email,
                password=password
            )
            # Registration successful
            session['authenticated'] = True  # Set the session variable
            # You can add additional user data to the Firestore or Realtime Database here if needed
            return redirect('/')
        except Exception as e:
            return "Registration failed: " + str(e)

    return render_template('register.html')  # Create an HTML template for the registration form

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Handle POST request for user authentication
        email = request.form['email']
        password = request.form['password']

        try:
            user = auth.get_user_by_email(email)
            # Assuming authentication is successful
            session['authenticated'] = True  # Set the session variable
            # Handle authentication success here.
            return redirect('/')
        except auth.AuthError as e:
            # Handle authentication failure here
            return "Login failed: " + str(e)

    # Handle GET request for displaying the login form
    return render_template('login.html')  # Create an HTML template for the login form


@app.route('/logout', methods=['POST'])
def logout():
    # Clear the user's session to log them out
    session.clear()
    return redirect('/login')


def authenticate_user(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('authenticated'):
            return f(*args, **kwargs)
        else:
            return redirect(url_for('login'))  # Redirect to the login page
    return decorated_function


@app.route('/get_products_data', methods=['GET'])
# @authenticate_user
def get_products_data():
    products_ref = firebase_db.reference('products')
    products = products_ref.get()

    if products is not None:
        product_data = []
        product_ids = []
        current_date = datetime.now(pt_timezone).date()

        for key, product in products.items():
            expiration_date = product.get('expiration_date')
            expiration_status = False  # Initialize it to False

            if expiration_date and expiration_date != 'None':
                try:
                    expiration_date = datetime.strptime(expiration_date, '%d %b %Y').date()
                    if expiration_date <= current_date:
                        expiration_status = True
                    expiration_date = expiration_date.strftime('%d %b %Y')
                except ValueError as e:
                    print(f"Error parsing expiration date for product {key}: {e}")

            product_info = {
                'product_id': key,
                'product_name': product['product_name'],
                'expiration_date': expiration_date,
                'location': product['location'],
                'category': product['category'],
                'wasted_status': product['wasted_status'],
                'expiration_status': expiration_status
            }

            product_data.append(product_info)
            product_ids.append(key)
            wasted_statuses = []
            for product in product_data:
                if 'wasted_status' in product:
                    wasted_status = product['wasted_status']
                    wasted_statuses.append(wasted_status)

        return jsonify({'products': product_data, 'product_ids': product_ids})
    else:
        # Handle the case when there is no product data
        return jsonify({'products': [], 'product_ids': []})

    products_ref = firebase_db.reference('products')
    products = products_ref.get()

    product_data = []
    product_ids = []
    current_date = datetime.now(pt_timezone).date()

    for key, product in products.items():
        expiration_date = product.get('expiration_date')
        expiration_status = False  # Initialize it to False

        if expiration_date and expiration_date != 'None':
            try:
                expiration_date = datetime.strptime(expiration_date, '%d %b %Y').date()
                if expiration_date <= current_date:
                    expiration_status = True
                expiration_date = expiration_date.strftime('%d %b %Y')
            except ValueError as e:
                print(f"Error parsing expiration date for product {key}: {e}")

        product_info = {
            'product_id': key,
            'product_name': product['product_name'],
            'expiration_date': expiration_date,
            'location': product['location'],
            'category': product['category'],
            'wasted_status': product['wasted_status'],
            'expiration_status': expiration_status
        }

        product_data.append(product_info)
        product_ids.append(key)
        wasted_statuses = []
        for product in product_data:
            if 'wasted_status' in product:
                wasted_status = product['wasted_status']
                wasted_statuses.append(wasted_status)

    return jsonify({'products': product_data, 'product_ids': product_ids})

@app.route('/', methods=['POST', 'GET'])
@authenticate_user
def index():
    current_date = datetime.now(pt_timezone).date()

    if request.method == 'POST':
        item_content = request.form['product-name']

        # Check if the "No Expiration Date" checkbox is checked
        no_expiration = 'no-expiration' in request.form

        if not no_expiration:
            expiration_date_str = request.form['expiration-date']
            try:
                item_expiration_datetime_utc = datetime.strptime(expiration_date_str, '%Y-%m-%d').replace(tzinfo=pytz.utc)
                item_expiration_datetime_pt = item_expiration_datetime_utc
                item_expiration_date = item_expiration_datetime_pt.date()

                if item_expiration_date <= current_date:
                    return redirect(url_for('expired_date_input'))
            except ValueError:
                # Handle invalid date format here
                return render_template("error.html", error_message="Invalid date format")

        else:
            item_expiration_date = None  # No expiration date

        location = request.form['locations']
        category = request.form['category']
        barcode_number = request.form['barcode-number']

        # Your code to retrieve barcode information from Firebase
        barcodes_ref = firebase_db.reference('barcodes')
        barcode = None

        # Use a loop to find the matching barcode by its 'barcode_value'
        for barcode_id, barcode_data in barcodes_ref.get().items():
            if 'barcode_value' in barcode_data and barcode_data['barcode_value'] == barcode_number:
                barcode = {
                    'id': barcode_id,
                    'barcode_value': barcode_data['barcode_value'],
                    'barcode_item_name': barcode_data.get('barcode_item_name', '')
                }
                break

        # Add the code to handle item_expiration_date here
        if item_expiration_date is not None:
            expiration_date_str = item_expiration_date.strftime('%d %b %Y')
        else:
            expiration_date_str = ''

        # creation date a new product dictionary with relevant information
        new_product = {
            'product_name': item_content,
            'expiration_date': expiration_date_str,
            'location': location,
            'category': category,
            'barcode_id': barcode['id'] if barcode else None,
            'wasted_status': False,
            'date_created': current_date.strftime('%d %b %Y')
        }


        # Push the new product to the 'products' node in Firebase
        products_ref = firebase_db.reference('products')
        new_product_ref = products_ref.push(new_product)

        # Redirect or perform further actions as needed
        return redirect(url_for('index'))
    
    else:
        location_filter = request.args.get('location-filter', 'All')
        category_filter = request.args.get('category', 'All')
        expiration_date_filter = request.args.get('expiration-date', '')
        expiration_status_filter = request.args.get('expiration-status', 'all')

        # Reference the 'products' node in Firebase
        products_ref = firebase_db.reference('products')
        products = products_ref.get()

        if products is not None:
            filtered_products = []

            for key, product_data in products.items():
                expiration_date_str = product_data.get('expiration_date')
                if expiration_date_str:
                    try:
                        expiration_date = datetime.strptime(expiration_date_str, '%d %b %Y').date()
                    except ValueError:
                        expiration_date = None  # Handle invalid date format
                else:
                    expiration_date = None  # No expiration date provided

                # Apply filters
                if (location_filter == 'All' or product_data['location'] == location_filter) and \
                (category_filter == 'All' or product_data['category'] == category_filter) and \
                (expiration_date_filter == '' or (expiration_date and expiration_date.strftime('%d %b %Y') == expiration_date_filter)) and \
                (expiration_status_filter == 'all' or
                    (expiration_status_filter == 'expired' and expiration_date and expiration_date <= current_date) or
                    (expiration_status_filter == 'not_expired' and expiration_date and expiration_date > current_date) or
                    (expiration_status_filter == 'not_expiring' and not expiration_date)):

                    product_info = {
                        'product_id': key,
                        'product_name': product_data['product_name'],
                        'expiration_date': product_data['expiration_date'] if product_data.get('expiration_date') else 'Unknown',
                        'location': product_data['location'],
                        'category': product_data['category'],
                        'wasted_status': product_data.get('wasted_status', False),  # Set to False if not present
                        'expiration_status': (expiration_date is not None and expiration_date <= current_date),
                        'date_created': product_data.get('date_created')  # Add this line
                    }
                if product_info['wasted_status'] is False:  # Only add if wasted_status is False
                    filtered_products.append(product_info)

            return render_template("index.html", products=filtered_products, current_date=current_date.strftime('%Y-%m-%d'),
                                selected_location=location_filter, selected_category=category_filter,
                                selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)

        else:
            # Handle the case when there is no product data
            return render_template("index.html", products=[], current_date=current_date.strftime('%Y-%m-%d'),
                                selected_location=location_filter, selected_category=category_filter,
                                selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)
# Route to check if a barcode exists
@app.route('/check_barcode', methods=['POST'])
def check_barcode():
    try:
        data = request.json
        barcode_value = data.get('barcode')

        # Reference the 'barcodes' node in Firebase
        barcodes_ref = firebase_db.reference('barcodes')

        # Check if the scanned barcode exists in Firebase
        barcode = None
        for barcode_id, barcode_data in barcodes_ref.get().items():
            if 'barcode_value' in barcode_data and barcode_data['barcode_value'] == barcode_value:
                barcode = {
                    'id': barcode_id,
                    'barcode_value': barcode_data['barcode_value'],
                    'barcode_item_name': barcode_data.get('barcode_item_name', '')
                }
                break

        if barcode:
            # If the barcode exists, you can access its data using barcode['barcode_item_name']
            product_name = barcode['barcode_item_name']
            return jsonify({'exists': True, 'productName': product_name})
        else:
            return jsonify({'exists': False})

    except Exception as e:
        return jsonify({'error': str(e)})


# Route to add a new barcode
@app.route('/add_barcode', methods=['POST'])
@authenticate_user
def add_barcode():
    try:
        item_name = request.form['barcode-item-name']
        barcode_number = request.form['barcode-number']

        # Reference the 'barcodes' node in Firebase
        barcodes_ref = firebase_db.reference('barcodes')

        # Create a new barcode data dictionary
        new_barcode_data = {
            'barcode_value': barcode_number,
            'barcode_item_name': item_name
        }

        # Push the new barcode data to the 'barcodes' node in Firebase
        new_barcode_ref = barcodes_ref.push(new_barcode_data)

        # Redirect or perform further actions as needed
        return redirect('/')

    except Exception as e:
        return jsonify({'error': str(e)})


@app.route('/check_expiration_status', methods=['GET'])
def check_expiration_status():
    current_date = datetime.now(pt_timezone).date()

    # Assuming 'product' is a string representing the expiration date
    product = request.args.get('product', None)

    if product is not None:
        try:
            product_expiration_date = datetime.strptime(
                product, '%Y-%m-%d').date()
        except ValueError as e:
            # Handle any potential parsing errors or log them
            print(f"Error parsing product expiration date: {e}")

        if product_expiration_date is not None and product_expiration_date <= current_date:
            # Handle the case where the product has expired
            return "Expired"
        else:
            # Handle the case where the product has not expired
            return "Not Expired"

    # Handle cases where 'product' is None or not provided
    return "Unknown"

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


@app.route('/update_product/<string:id>', methods=['GET', 'POST'])
def update_product(id):
    # Reference the 'products' node in Firebase
    products_ref = firebase_db.reference('products')
    
    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()

    if product_data is None:
        return "Product not found", 404

    # Assign the 'product_id' to the product_data
    product_data['product_id'] = id

    if request.method == 'POST':
        # Update the product information
        product_data['product_name'] = request.form['product-name']

        # Check if the "No Expiration Date Button" is checked
        if 'no-expiration' in request.form and request.form['no-expiration'] == 'on':
            # Handle the case where there is no expiration date
            product_data['expiration_date'] = 'Unknown'
        else:
            # Try to parse the expiration date in '%Y-%m-%d' format
            expiration_date_str = request.form['expiration-date']
            try:
                expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d').strftime('%Y-%m-%d')
                product_data['expiration_date'] = expiration_date
            except ValueError:
                # Handle the case where the date is not in the expected format
                return "Invalid expiration date format"

        try:
            # Update the product data in Firebase
            product_ref.update(product_data)
            return redirect('/')
        except Exception as e:
            return jsonify({'error': str(e)})
    else:
        return render_template('update_product.html', product=product_data)


# Define the route to delete a product
@app.route('/delete_product/<string:id>')
def delete_product(id):
    # Reference the 'products' node in Firebase
    products_ref = firebase_db.reference('products')

    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()
    
    if product_data is None:
        return "Product not found", 404

    try:
        # Delete the product from Firebase
        product_ref.delete()
        return redirect(request.referrer)
    except Exception as e:
        return jsonify({'error': str(e)})
    


    

@app.route('/waste_product/<string:id>')
def waste_product(id):
    # Reference the 'products' node in Firebase
    products_ref = firebase_db.reference('products')

    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()
    product_data['product_id'] = id

    if product_data is None:
        return "Product not found", 404

    try:
        # Update the 'wasted_status' field of the product in Firebase to mark it as wasted
        product_ref.update({'wasted_status': True})
        return redirect('/')
    except Exception as e:
        return jsonify({'error': str(e)})


@app.route('/wasted_product_list', methods=['GET'])
def wasted_product_list():
    # Reference the 'products' node in Firebase
    products_ref = firebase_db.reference('products')

    # Retrieve all products that are marked as wasted from Firebase
    wasted_products = []
    for key, product_data in products_ref.get().items():
        if 'wasted_status' in product_data and product_data['wasted_status']:
            expiration_date_str = product_data.get('expiration_date')
            if expiration_date_str:
                try:
                    expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d')
                except ValueError:
                    expiration_date = None  # Handle invalid date format
            else:
                expiration_date = None  # No expiration date provided

            if expiration_date:
                formatted_expiration_date = expiration_date.strftime('%b %d %Y')
            else:
                formatted_expiration_date = 'Unknown'

            # Add the 'date_wasted' attribute if it's present in the product_data
            date_wasted = product_data.get('date_wasted', 'No Wasted Date')

            wasted_products.append({
                'product_id': key,
                'product_name': product_data['product_name'],
                'expiration_date': formatted_expiration_date,
                'location': product_data['location'],
                'category': product_data['category'],
                'wasted_status': product_data.get('wasted_status'),
                'date_wasted': date_wasted,
            })

    return render_template("wasted_product_list.html", products=wasted_products)


# Route for generating a recipe based on user input
@app.route('/generate_recipe', methods=['POST', 'GET'])
def generate_recipe_user_input():
    if request.method == 'POST':
        user_input = request.form.get('user-input')
        # Assuming generate_recipe accepts a list
        recipe_suggestion = generate_recipe([user_input])
        return jsonify({'recipe_suggestion': recipe_suggestion})
    else:
        return render_template("generate_recipe.html")


# Route to generate a recipe from the Firebase database
@app.route('/generate_recipe_from_firebase', methods=['GET'])
def generate_recipe_from_firebase():
    # Reference the 'products' node in Firebase
    products_ref = firebase_db.reference('products')

    # Retrieve product names from Firebase
    product_names = [product_data['product_name']
                     for product_data in products_ref.get().values()]

    # Generate a recipe based on the product names
    recipe_suggestion = generate_recipe(product_names)

    return jsonify({'recipe_suggestion': recipe_suggestion})


def on_terminate(signal, frame):
    print("Received terminate signal at %s" % datetime.now())
    sys.exit(0)


send_mail.init_schedule_thread()

if __name__ == '__main__':
    # app.run(host='0.0.0.0', port=5000, debug=True, threaded=False)
    app.run(debug=True, port=8111)
