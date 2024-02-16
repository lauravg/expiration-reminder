from config import pt_timezone
from datetime import datetime
from functools import wraps
import json
import pytz
import requests
import secrets
import sys

from absl import logging as log
import firebase_admin
from firebase_admin import credentials, auth, firestore
from firebase_admin.auth import UserRecord
from flask import Flask, jsonify, redirect, render_template, request, url_for
import flask_login
from flask_login import LoginManager, login_user, logout_user, login_required

from barcode_manager import BarcodeManager, Barcode
from household_manager import Household, HouseholdManager
from product_manager import ProductManager, Product
from recipe import RecipeGenerator
from secrets_manager import SecretsManager
from send_email import SendMail
from user_manager import UserManager, User

app = Flask(__name__)
# Generate a secure secret key for the app, required for session management.
secret_key = secrets.token_urlsafe(16)
app.secret_key = secret_key
app.config.update(SESSION_COOKIE_SECURE=True)


log.set_verbosity(log.DEBUG if app.debug else log.INFO)

secrets_mgr = SecretsManager()
json_data = json.loads(secrets_mgr.get_firebase_service_account_json())
cred = credentials.Certificate(json_data)

firebase_admin.initialize_app(cred)
firestore = firestore.client()
barcodes = BarcodeManager(firestore)
product_mgr = ProductManager(firestore)
household_manager = HouseholdManager(firestore)

# Create an instance of SendMail with the app and pt_timezone
recipe_generator = RecipeGenerator(secrets_mgr)
send_mail = SendMail(app, app, pt_timezone, recipe_generator)

user_manager = UserManager()

# Used to manages sessions and user logins
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


# Create an instance of SendMail with the app and pt_timezone
def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)


@login_manager.user_loader
def load_user(uid: str) -> User:
    return user_manager.get_user(uid)

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

            # TODO: Show some kind of "registration successful" message.
            # TODO: Activate email confirmation flow?
            return redirect('/')
        except Exception as e:
            return 'Registration failed: ' + str(e), 500
    else:
        return render_template('register.html')


# Login route for user authentication
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        next = request.form['next']
        firebase_web_api_key = secrets_mgr.get_firebase_web_api_key()

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
            # See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithPassword
            user_data = response.json()
            user = user_manager.get_user(user_data['localId'])
            login_user(user)
            log.info("User successfully logged in: %s", user.display_name())
            if not is_url_safe(next):
                next = "/"

            # Ensure there is at least one household for the person
            # In the future we should always create a household for the current user.
            households = household_manager.get_households_for_user(user.get_id())
            if len(households) == 0:
                log.warning("No households found for user. Creating one now")
                name = f"{user.display_name()}'s Household" if not user.display_name().isspace() else "Default Household"
                household = Household(None, user.get_id(), name, [user.get_id()])
                if not household_manager.add_or_update_household(household):
                    log.error("Unable to create default household for user.")
            return redirect(next)
        else:
            # Output the response for debugging purposes
            log.warning(f'Login failed. Response: {response.json()}')

            # Handle authentication failure
            return 'Login failed: ' + response.json().get('error', {}).get('message', 'Unknown error')

    next = request.args.get('next')
    if not is_url_safe(next):
        next = "/"
    return render_template('login.html', next_url=next)


# Logout route to clear the user's session
@app.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return redirect('/')


@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    user: User = flask_login.current_user
    try:
        # Fetch the user's display name and email from Firebase Authentication
        display_name = user.display_name()
        email = user.email()
    except auth.AuthError as e:
        log.error(f'Error retrieving user information: {e}')
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
                user.get_id(),
                password=new_password
            )
        if new_email:
            # Handle email update
            auth.update_user(
                user.get_id(),
                email=new_email
            )
        if new_name:
            # Handle display name update
            auth.update_user(
                user.get_id(),
                display_name=new_name
            )
        # Go back to the main page after submitting settings.
        return redirect("/")
    households = household_manager.get_households_for_user(user.get_id())
    return render_template('settings.html', display_name=display_name, email=email, households=households)


# TODO: Is this still necessary? Does not seem to be used anywhere.
# @app.route('/get_products_data', methods=['GET'])
# @authenticate_user
# def get_products_data():
#     user_uid = session.get('user_uid')
#     products = products_ref.order_by_child('user_uid').equal_to(user_uid).get()

#     if products is not None:
#         product_data = []
#         product_ids = []
#         current_date = datetime.now(pt_timezone).date()

#         for key, product in products.items():
#             # Check if the product belongs to the current user based on UUID
#             if 'user_uid' in product and product['user_uid'] == user_uid:
#                 expiration_date = product.get('expiration_date')
#                 expiration_status = False  # Initialize it to False here

#                 if expiration_date and expiration_date != 'None':
#                     try:
#                         expiration_date = datetime.strptime(expiration_date, '%d %b %Y').date()
#                         if expiration_date <= current_date:
#                             expiration_status = True
#                         expiration_date = expiration_date.strftime('%d %b %Y')
#                     except ValueError as e:
#                         log.error(f'Error parsing expiration date for product {key}: {e}')

#                 product_info = {
#                     'product_id': key,
#                     'product_name': product['product_name'],
#                     'expiration_date': expiration_date,
#                     'location': product['location'],
#                     'category': product['category'],
#                     'wasted_status': product['wasted_status'],
#                     'expiration_status': expiration_status
#                 }

#                 product_data.append(product_info)
#                 product_ids.append(key)

#         return jsonify({'products': product_data, 'product_ids': product_ids})
#     else:
#         # Handle the case when there is no product data
#         return jsonify({'products': [], 'product_ids': []})


# Update the route to include the display name
@app.route('/', methods=['POST', 'GET'])
@login_required
def index():
    user: User = flask_login.current_user

    # Get the current date in the PT timezone
    current_date = datetime.now(pt_timezone).date()

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
        barcode: Barcode = None

        if barcode_number != '':
            barcode = barcodes.get_barcode(barcode_number)

            # Handle the case when there are no barcode data
            if barcode is None:
                # Add a new barcode
                barcode = Barcode(barcode_number, request.form['product-name'])
                barcodes.add_barcode(barcode)

        # Add the code to handle item_expiration_date here
        if item_expiration_date is not None:
            expiration_date_str = item_expiration_date.strftime('%d %b %Y')
        else:
            expiration_date_str = ''

        household = household_manager.get_active_household()
        if household == None:
            msg = "Cannot add product: No active household set"
            log.error(msg)
            return msg, 500

        product = Product(None,
                            barcode=barcode.code if barcode else None,
                            category=category,
                            created=ProductManager.parse_import_date(datetime.now(pt_timezone).strftime('%d %b %Y')),
                            expires=ProductManager.parse_import_date(expiration_date_str),
                            location=location,
                            product_name=item_content,
                            uid=user.get_id(),
                            household_id=household.id,
                            wasted=False,
                            wasted_timestamp=0)

        if not product_mgr.add_product(product):
            return "Unable to add product", 500
        # Redirect or perform further actions as needed
        return redirect(url_for('index'))

    else:
        # Get filters and parameters from the request
        location_filter = request.args.get('location-filter', 'All')
        category_filter = request.args.get('category', 'All')
        expiration_date_filter = request.args.get('expiration-date', '')
        expiration_status_filter = request.args.get('expiration-status', 'all')

        # Reference the 'products' node in Firebase
        products = product_mgr.get_products(user.get_id())
        filtered_products: list[Product] = []
        for product in products:
            expiration_date = datetime.utcfromtimestamp(product.expires / 1000).date()

            # Apply filters to select products
            if (location_filter == 'All' or product.location == location_filter) and \
            (category_filter == 'All' or product.category == category_filter) and \
            (expiration_date_filter == '' or (expiration_date and expiration_date.strftime('%d %b %Y') == expiration_date_filter)) and \
            (expiration_status_filter == 'all' or
                (expiration_status_filter == 'expired' and expiration_date and expiration_date <= current_date) or
                (expiration_status_filter == 'not_expired' and expiration_date and expiration_date > current_date) or
                (expiration_status_filter == 'not_expiring' and not expiration_date)):

                product_info = {
                    'product_id': product.id,
                    'product_name': product.product_name,
                    'expiration_date': product.expiration_str(),  # Does "Unknown" still exist?
                    'location': product.location,
                    'category': product.category,
                    'wasted_status': product.wasted,
                    'expired': (expiration_date is not None and expiration_date < current_date),
                    'date_created': product.creation_str()
                }
                if product_info['wasted_status'] is False:
                    filtered_products.append(product_info)
        return render_template('index.html',display_name=user.display_name(), products=filtered_products, current_date=current_date.strftime('%Y-%m-%d'),
                            selected_location=location_filter, selected_category=category_filter,
                            selected_expiration_date=expiration_date_filter, selected_status=expiration_status_filter)


@app.route('/check_barcode', methods=['POST'])
@login_required
def check_barcode():
    data = request.get_json()
    barcode_value = data.get('barcode')

    # Ensure a valid barcode is provided
    if not barcode_value:
        response = {'exists': False, 'productName': ''}
        return jsonify(response)

    # Retrieve barcode data from Firebase
    barcode = barcodes.get_barcode(barcode_value)
    if barcode == None:
        # If the barcode is not found in the database, indicate that it does not exist
        response = {'exists': False, 'productName': ''}
        return jsonify(response)

    response = {'exists': True, 'productName': barcode.name}
    return jsonify(response)



# Route to check the expiration status of a product
@app.route('/check_expiration_status', methods=['GET'])
@login_required
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
            log.error(f'Error parsing product expiration date: {e}')

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
@login_required
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
@login_required
def update_product(id):
    # Retrieve the product by its ID from Firebase
    product = product_mgr.get_product(id)

    # Check if the product doesn't exist
    if product is None:
        return 'Product not found', 404

    # Assign the 'product_id' to the product_data
    if request.method == 'POST':
        # Update the product information
        product.product_name = request.form['product-name']

        # Check if the 'No Expiration Date Button' is checked
        if 'no-expiration' in request.form and request.form['no-expiration'] == 'on':
            # Handle the case where there is no expiration date
            product.expires = 0
        else:
            # Try to parse the expiration date in '%Y-%m-%d' format
            expiration_date_str = request.form['expiration-date']
            try:
                expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d')
                epoch_obj = datetime.utcfromtimestamp(0)
                product.expires = int((expiration_date - epoch_obj).total_seconds() * 1000)
            except ValueError:
                # Handle the case where the date is not in the expected format
                return 'Invalid expiration date format'

        try:
            # Update the product data in Firebase
            product_mgr.add_product(product)
            return redirect('/')
        except Exception as e:
            return jsonify({'error': str(e)})
    else:
        # The dates needs to be formatted in this exact wat to be set in the
        # HTML date widget.
        product_data = dict(product)
        product_data["id"] = product.id
        product_data["creation_html_date"] = product.creation_str(format="%Y-%m-%d")
        product_data["expiration_html_date"] = product.expiration_str(format="%Y-%m-%d")
        log.info("Expiration HTMl Date: '%s'", product_data["expiration_html_date"])
        return render_template('update_product.html', product=product_data)


# Route to delete a product
@app.route('/delete_product/<string:id>')
@login_required
def delete_product(id):
    success = product_mgr.delete_product(id)
    if not success:
        return 'Unable to delete product', 404

    return redirect(request.referrer)

# Route to mark a product as wasted
@app.route('/waste_product/<string:id>')
@login_required
def waste_product(id):
    product = product_mgr.get_product(id)
    if product is None:
        return 'Product not found', 404

    # Update the 'wasted_status' field of the product in Firebase to mark it as wasted
    product.wasted = True
    # TODO: Timezone should be whatever the user's timezone is. Need to get
    #       that info from the browser
    product.wasted_timestamp = ProductManager.parse_import_date(datetime.now(pt_timezone).strftime('%d %b %Y'))
    if not product_mgr.add_product(product):
        return "Unable to update product to wasted state", 500
    return redirect('/')


# Route to view the list of wasted products
@app.route('/wasted_product_list', methods=['GET'])
@login_required
def wasted_product_list():
    user: User = flask_login.current_user
    # Retrieve all products that are marked as wasted from Firebase
    wasted_products = []
    for product in product_mgr.get_products(user.get_id()):
        if product.wasted:
            expiration_date_str = product.expiration_str()
            if not expiration_date_str:
                expiration_date_str = "Unknown"

            # Add the 'date_wasted' attribute if it's present in the product_data
            date_wasted_str = product.wasted_date_str()
            if not date_wasted_str:
                date_wasted_str = "No Wasted Date"

            wasted_products.append({
                'product_id': product.id,
                'product_name': product.product_name,
                'expiration_date': expiration_date_str,
                'location': product.location,
                'category': product.category,
                'wasted_status': product.wasted,
                'date_wasted': date_wasted_str,
            })

    return render_template('wasted_product_list.html', products=wasted_products)


# Route for generating a recipe based on user input
@app.route('/generate_recipe', methods=['POST', 'GET'])
@login_required
def generate_recipe_user_input():
    if request.method == 'POST':
        user_input = request.form.get('user-input')
        # Assuming generate_recipe accepts a list
        recipe_suggestion = recipe_generator.generate_recipe([user_input])
        return jsonify({'recipe_suggestion': recipe_suggestion})
    else:
        return render_template('generate_recipe.html')


# Route to generate a recipe from the Firebase database
@app.route('/generate_recipe_from_database', methods=['GET'])
@login_required
def generate_recipe_from_database():
    user: User = flask_login.current_user
    today_millis = ProductManager.parse_import_date(datetime.now(pt_timezone).strftime('%d %b %Y'))
    # Retrieve product names for current user from Firestore.
    product_names = []
    for product in product_mgr.get_products(user.get_id()):
        # Ensure the product is neither wasted nor expired.
        if not product.wasted and product.expires >= today_millis:
            product_names.append(product.product_name)

    # Generate a recipe based on the product names
    recipe_suggestion = recipe_generator.generate_recipe(product_names)
    return jsonify({'recipe_suggestion': recipe_suggestion})

# Route for generating a recipe based on user input
@app.route('/update_households', methods=['POST'])
@login_required
def update_households():
    return redirect("/settings")

def is_url_safe(url: str) -> bool:
    return url in ["/",
                   "/register",
                   "/login",
                   "/logout",
                   "/settings",
                   "/generate_recipe",
                   "/wasted_product_list"]

# Define a signal handler to handle termination signals
def on_terminate(signal, frame):
    log.info('Received terminate signal at %s' % datetime.now())
    sys.exit(0)


# Initialize and start a schedule thread for sending emails
if not app.debug:
    send_mail.init_schedule_thread()
else:
    log.warning("⚠️ NOT initializing schedule thread in --debug mode ⚠️")

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, port=8111)

