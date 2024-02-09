from config import pt_timezone
from datetime import datetime
from functools import wraps
import json
import pytz
import requests
import secrets
import sys
import uuid

from absl import logging as log
import firebase_admin
from firebase_admin import credentials, auth
from firebase_admin import db as firebase_db
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from recipe import RecipeGenerator
from secrets_manager import SecretsManager
from send_email import SendMail

app = Flask(__name__)
log.set_verbosity(log.DEBUG if app.debug else log.INFO)

secrets_mgr = SecretsManager()
json_data = json.loads(secrets_mgr.get_firebase_service_account_json())
cred = credentials.Certificate(json_data)

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://pantryguardian-f8381-default-rtdb.firebaseio.com'
})


# Generate a secure secret key for the app
secret_key = secrets.token_urlsafe(16)
app.secret_key = secret_key

# Create an instance of SendMail with the app and pt_timezone
recipe_generator = RecipeGenerator(secrets_mgr)
send_mail = SendMail(app, app, pt_timezone, recipe_generator)


# Create an instance of SendMail with the app and pt_timezone
def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)

barcodes_ref = firebase_db.reference('barcodes')
products_ref = firebase_db.reference('products')

# Register route for user registration
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        name = request.form['name']  # Get the user's name from the form

        try:
            # Create a new user with provided email and password
            user = auth.create_user(
                email=email,
                password=password,
            )

            # Set the user's display name in the Firebase Authentication system
            auth.update_user(
                user.uid,
                display_name=name
            )

            # Set user_uid in the session upon successful registration
            session['authenticated'] = True
            session['user_uid'] = user.uid

            session['authenticated'] = True
            return redirect('/')
        except Exception as e:
            return 'Registration failed: ' + str(e)

    return render_template('register.html')


# Login route for user authentication
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        firebase_web_api_key = secrets_mgr.get_firebase_web_api_key()

        log.debug(f'Attempting login with email: {email}, password: {password}')
        log.debug(firebase_web_api_key)

        # Make a request to Firebase Authentication REST API for sign-in
        request_data = {
            'email': email,
            'password': password,
            'returnSecureToken': True
        }

        response = requests.post(
            f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_web_api_key}',
            json=request_data
        )

        if response.ok:
            user_data = response.json()
            session['authenticated'] = True
            session['user_uid'] = user_data['localId']
            return redirect('/')
        else:
            # Output the response for debugging purposes
            print(f'Login failed. Response: {response.json()}')

            # Handle authentication failure
            return 'Login failed: ' + response.json().get('error', {}).get('message', 'Unknown error')

    return render_template('login.html')



# Logout route to clear the user's session
@app.route('/logout', methods=['POST'])
def logout():
    # Clear the user's session to log them out
    session.clear()
    return redirect('/login')


# Decorator to authenticate users for protected routes
def authenticate_user(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('authenticated'):
            return f(*args, **kwargs)
        else:
            # Redirect to the login page
            return redirect(url_for('login'))
    return decorated_function



@app.route('/settings', methods=['GET', 'POST'])
@authenticate_user
def settings():
    user_uid = session['user_uid']

    try:
        # Fetch the user's display name and email from Firebase Authentication
        user = auth.get_user(user_uid)
        display_name = user.display_name
        email = user.email
    except auth.AuthError as e:
        print(f'Error retrieving user information: {e}')
        display_name = 'User'
        email = 'user@example.com'

    if request.method == 'POST':
        # Handle form submission to update user details
        new_password = request.form.get('new_password')
        new_email = request.form.get('new_email')
        new_name = request.form.get('new_name')

        # Update user details in Firebase Authentication
        if new_password:
            # Handle password update
            auth.update_user(
                user_uid,
                password=new_password
            )
        if new_email:
            # Handle email update
            auth.update_user(
                user_uid,
                email=new_email
            )
        if new_name:
            # Handle display name update
            auth.update_user(
                user_uid,
                display_name=new_name
            )

    return render_template('settings.html', display_name=display_name, email=email)


@app.route('/get_products_data', methods=['GET'])
@authenticate_user
def get_products_data():
    user_uid = session.get('user_uid')
    products = products_ref.order_by_child('user_uid').equal_to(user_uid).get()

    if products is not None:
        product_data = []
        product_ids = []
        current_date = datetime.now(pt_timezone).date()

        for key, product in products.items():
            # Check if the product belongs to the current user based on UUID
            if 'user_uid' in product and product['user_uid'] == user_uid:
                expiration_date = product.get('expiration_date')
                expiration_status = False  # Initialize it to False here

                if expiration_date and expiration_date != 'None':
                    try:
                        expiration_date = datetime.strptime(expiration_date, '%d %b %Y').date()
                        if expiration_date <= current_date:
                            expiration_status = True
                        expiration_date = expiration_date.strftime('%d %b %Y')
                    except ValueError as e:
                        print(f'Error parsing expiration date for product {key}: {e}')

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

        return jsonify({'products': product_data, 'product_ids': product_ids})
    else:
        # Handle the case when there is no product data
        return jsonify({'products': [], 'product_ids': []})


# Update the route to include the display name
@app.route('/', methods=['POST', 'GET'])
@authenticate_user
def index():
    if 'authenticated' in session and session['authenticated']:
        # Assuming you have the user's UID stored in session['user_uid']
        user_uid = session['user_uid']

        try:
            # Fetch the user's display name from Firebase Authentication
            user = auth.get_user(user_uid)
            display_name = user.display_name
        except Exception as e:
            display_name = 'User'

        user_uid = session.get('user_uid')

        # Get the current date in the PT timezone
        current_date = datetime.now(pt_timezone).date()
        try:
            user = auth.get_user(user_uid)
        except auth.AuthError as e:
            print(f'Error retrieving user email: {e}')

        if request.method == 'POST':
            # Get the item content from the form
            item_content = request.form['product-name']

            # Check if the 'No Expiration Date' checkbox is checked
            no_expiration = 'no-expiration' in request.form

            if not no_expiration:
                # Parse the expiration date from the form
                expiration_date_str = request.form['expiration-date']
                try:
                    # Convert the expiration date to UTC timezone
                    item_expiration_datetime_utc = datetime.strptime(expiration_date_str, '%Y-%m-%d').replace(tzinfo=pytz.utc)
                    # Convert the expiration date to PT timezone
                    item_expiration_datetime_pt = item_expiration_datetime_utc
                    # Get the date part of the expiration date
                    item_expiration_date = item_expiration_datetime_pt.date()

                except ValueError:
                    # Handle invalid date format here
                    return render_template('error.html', error_message='Invalid date format')

            else:
                item_expiration_date = None  # No expiration date

            # Get location, category, and barcode information from the form
            location = request.form['locations']
            category = request.form['category']
            barcode_number = request.form['barcode-number']
            barcode = None

            if barcode_number != '':
                barcodes_data = barcodes_ref.get()

                if not barcodes_ref.get():
                    # If it doesn't exist, create the 'barcodes' node with an initial entry
                    initial_entry = {
                        'barcode_value': request.form['barcode-number'],
                        'barcode_item_name': request.form['product-name']
                    }
                    # Generate a unique ID for the initial entry
                    barcode_id = str(uuid.uuid4())
                    barcodes_ref.child(barcode_id).set(initial_entry)

                if barcodes_data is not None:
                    for barcode_id, barcode_data in barcodes_data.items():
                        if 'barcode_value' in barcode_data and barcode_data['barcode_value'] == barcode_number:
                            barcode = {
                                'id': barcode_id,
                                'barcode_value': barcode_data['barcode_value'],
                                'barcode_item_name': barcode_data.get('barcode_item_name', '')
                            }
                            break

                    # Handle the case when there are no barcode data
                    if barcode is None:
                        # Add a new barcode entry here
                        new_barcode_entry = {
                            'barcode_value': barcode_number,
                            'barcode_item_name': request.form['product-name']
                        }
                        # Generate a unique ID for the new barcode entry
                        new_barcode_id = str(uuid.uuid4())
                        barcodes_ref.child(new_barcode_id).set(new_barcode_entry)

                        # Now, set the barcode with the new entry's ID
                        barcode = {
                            'id': new_barcode_id,
                            'barcode_value': barcode_number,
                            'barcode_item_name': new_barcode_entry['barcode_item_name']
                        }

            # Add the code to handle item_expiration_date here
            if item_expiration_date is not None:
                expiration_date_str = item_expiration_date.strftime('%d %b %Y')
            else:
                expiration_date_str = ''

            # Create a new product dictionary with relevant information
            new_product = {
                'product_name': item_content,
                'expiration_date': expiration_date_str,
                'location': location,
                'category': category,
                'barcode_id': barcode['id'] if barcode else None,
                'wasted_status': False,
                'date_created': current_date.strftime('%d %b %Y'),
                'user_uid': user_uid
            }

            products_ref.push(new_product)

            # Redirect or perform further actions as needed
            return redirect(url_for('index'))

        else:
            # Get filters and parameters from the request
            location_filter = request.args.get('location-filter', 'All')
            category_filter = request.args.get('category', 'All')
            expiration_date_filter = request.args.get('expiration-date', '')
            expiration_status_filter = request.args.get('expiration-status', 'all')

            # Reference the 'products' node in Firebase
            products = products_ref.order_by_child('user_uid').equal_to(user_uid).get()


            if products is not None:
                filtered_products = []

                for key, product_data in products.items():
                    expiration_date_str = product_data.get('expiration_date')
                    if expiration_date_str:
                        try:
                            # Parse the expiration date
                            expiration_date = datetime.strptime(expiration_date_str, '%d %b %Y').date()
                        except ValueError:
                            expiration_date = None  # Handle invalid date format
                    else:
                        expiration_date = None  # No expiration date provided

                    # Apply filters to select products
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
                            'wasted_status': product_data.get('wasted_status', False),
                            'expiration_status': (expiration_date is not None and expiration_date <= current_date),
                            'date_created': product_data.get('date_created')
                        }
                    if product_info['wasted_status'] is False:
                        filtered_products.append(product_info)

                return render_template('index.html',display_name=display_name, products=filtered_products, current_date=current_date.strftime('%Y-%m-%d'),
                                    selected_location=location_filter, selected_category=category_filter,
                                    selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)

            else:
                # Handle the case when there is no product data
                return render_template('index.html', products=[], current_date=current_date.strftime('%Y-%m-%d'),
                                    selected_location=location_filter, selected_category=category_filter,
                                    selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)


@app.route('/check_barcode', methods=['POST'])
@authenticate_user
def check_barcode():
    data = request.get_json()
    barcode_value = data.get('barcode')

    # Ensure a valid barcode is provided
    if not barcode_value:
        response = {'exists': False, 'productName': ''}
        return jsonify(response)

    # Retrieve barcode data from Firebase
    barcodes_data = barcodes_ref.get()

    if barcodes_data is not None:
        for barcode_id, barcode_data in barcodes_data.items():
            if 'barcode_value' in barcode_data and barcode_data['barcode_value'] == barcode_value:
                # If the barcode exists in the database, get the product name (barcode_item_name)
                product_name = barcode_data.get('barcode_item_name', '')
                response = {'exists': True, 'productName': product_name}
                return jsonify(response)

    # If the barcode is not found in the database, indicate that it does not exist
    response = {'exists': False, 'productName': ''}
    return jsonify(response)


# Route to check the expiration status of a product
@app.route('/check_expiration_status', methods=['GET'])
@authenticate_user
def check_expiration_status():
    current_date = datetime.now(pt_timezone).date()

    # Get the product's expiration date from the request parameters
    product = request.args.get('product', None)

    if product is not None:
        try:
            # Parse the product's expiration date from a string to a date object
            product_expiration_date = datetime.strptime(
                product, '%Y-%m-%d').date()
        except ValueError as e:
            # Handle parsing errors and log them
            print(f'Error parsing product expiration date: {e}')

        if product_expiration_date is not None and product_expiration_date <= current_date:
            # Handle the case where the product has expired
            return 'Expired'
        else:
            # Handle the case where the product has not expired
            return 'Not Expired'

    # Handle cases where 'product' is None or not provided
    return 'Unknown'


# Route to handle expired date input
@app.route('/expired_date_input', methods=['POST'])
@authenticate_user
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


# Route to update a product
@app.route('/update_product/<string:id>', methods=['GET', 'POST'])
@authenticate_user
def update_product(id):
    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()

    # Check if the product doesn't exist
    if product_data is None:
        return 'Product not found', 404

    # Assign the 'product_id' to the product_data
    product_data['product_id'] = id

    if request.method == 'POST':
        # Update the product information
        product_data['product_name'] = request.form['product-name']

        # Check if the 'No Expiration Date Button' is checked
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
                return 'Invalid expiration date format'

        try:
            # Update the product data in Firebase
            product_ref.update(product_data)
            return redirect('/')
        except Exception as e:
            return jsonify({'error': str(e)})
    else:
        return render_template('update_product.html', product=product_data)


# Route to delete a product
@app.route('/delete_product/<string:id>')
@authenticate_user
def delete_product(id):
    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()

    if product_data is None:
        return 'Product not found', 404

    try:
        # Delete the product from Firebase
        product_ref.delete()
        return redirect(request.referrer)
    except Exception as e:
        return jsonify({'error': str(e)})


# Route to mark a product as wasted
@app.route('/waste_product/<string:id>')
@authenticate_user
def waste_product(id):
    # Retrieve the product by its ID from Firebase
    product_ref = products_ref.child(id)
    product_data = product_ref.get()
    product_data['product_id'] = id

    if product_data is None:
        return 'Product not found', 404

    try:
        # Update the 'wasted_status' field of the product in Firebase to mark it as wasted
        product_ref.update({'wasted_status': True})

        # Add the 'date_wasted' field with the current date
        current_date = datetime.now(pt_timezone).strftime('%d %b %Y')
        product_ref.update({'date_wasted': current_date})

        return redirect('/')
    except Exception as e:
        return jsonify({'error': str(e)})


# Route to view the list of wasted products
@app.route('/wasted_product_list', methods=['GET'])
@authenticate_user
def wasted_product_list():

    # Retrieve all products that are marked as wasted from Firebase
    wasted_products = []
    for key, product_data in products_ref.get().items():
        if 'wasted_status' in product_data and product_data['wasted_status']:
            expiration_date_str = product_data.get('expiration_date')
            if expiration_date_str:
                if expiration_date_str == 'Unknown':
                    expiration_date = None  # Handle 'Unknown' as no expiration date
                else:
                    try:
                        expiration_date = datetime.strptime(expiration_date_str, '%d %b %Y')
                    except ValueError:
                        # Handle invalid date format by marking as 'Unknown'
                        expiration_date = None
            else:
                expiration_date = None  # No expiration date provided

            if expiration_date:
                formatted_expiration_date = expiration_date.strftime('%d %b %Y')
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

    return render_template('wasted_product_list.html', products=wasted_products)


# Route for generating a recipe based on user input
@app.route('/generate_recipe', methods=['POST', 'GET'])
@authenticate_user
def generate_recipe_user_input():
    if request.method == 'POST':
        user_input = request.form.get('user-input')
        # Assuming generate_recipe accepts a list
        recipe_suggestion = recipe_generator.generate_recipe([user_input])
        return jsonify({'recipe_suggestion': recipe_suggestion})
    else:
        return render_template('generate_recipe.html')


# Route to generate a recipe from the Firebase database
@app.route('/generate_recipe_from_firebase', methods=['GET'])
@authenticate_user
def generate_recipe_from_firebase():

    # Retrieve product names from Firebase
    product_names = [product_data['product_name']
                     for product_data in products_ref.get().values()]

    # Generate a recipe based on the product names
    recipe_suggestion = recipe_generator.generate_recipe(product_names)

    return jsonify({'recipe_suggestion': recipe_suggestion})


# Define a signal handler to handle termination signals
def on_terminate(signal, frame):
    print('Received terminate signal at %s' % datetime.now())
    sys.exit(0)


# Initialize and start a schedule thread for sending emails
send_mail.init_schedule_thread()


# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, port=8111)

