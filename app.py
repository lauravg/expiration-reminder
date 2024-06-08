from flask_cors import CORS
from config import pt_timezone
from datetime import datetime
from functools import wraps
import json
import pytz
import requests
import secrets
import sys
import logging

from absl import logging as log
import firebase_admin
from firebase_admin import credentials, auth, firestore
from firebase_admin.auth import UserRecord, InvalidIdTokenError, ExpiredIdTokenError
from flask import Flask, jsonify, redirect, render_template, request, url_for
import flask_login
from flask_login import LoginManager, login_user, logout_user, login_required

from auth_manager import AuthManager
from barcode_manager import BarcodeManager, Barcode
from household_manager import Household, HouseholdManager
from product_manager import ProductManager, Product
from recipe import RecipeGenerator
from secrets_manager import SecretsManager
from send_email import SendMail
from user_manager import UserManager, User

app = Flask(__name__)
CORS(app)
# Generate a secure secret key for the app, required for session management.
secret_key = secrets.token_urlsafe(16)
app.secret_key = secret_key
app.config.update(SESSION_COOKIE_SECURE=True)

logging.basicConfig(level=logging.INFO)

log.set_verbosity(log.DEBUG if app.debug else log.INFO)

secrets_mgr = SecretsManager()
auth_mgr = AuthManager(secrets_mgr)
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
@app.route("/register", methods=["POST"])
def register():
    if request.method == "POST":
        data = request.form
        email = data["email"]
        password = data["password"]
        name = data["name"]

        try:
            # Create a new user with provided email and password
            user = auth.create_user(
                email=email,
                password=password,
            )

            auth.update_user(user.uid, display_name=name)

            return jsonify({"message": "Registration successful"}), 200
        except Exception as e:
            return jsonify({"message": f"Registration failed: {str(e)}"}), 500


# Updated login route for user authentication
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        next_url = request.form.get("next", "/")

        response = auth_mgr.login(email, password)

        if response.ok:
            uid = response.uid
            user = user_manager.get_user(uid)
            login_user(user)
            log.info("User successfully logged in: %s", user.display_name())
            if not is_url_safe(next_url):
                next_url = "/"

            # Ensure there is at least one household for the user
            households = household_manager.get_households_for_user(user.get_id())
            if len(households) == 0:
                log.warning("No households found for user. Creating one now")
                name = (
                    f"{user.display_name()}'s Household"
                    if not user.display_name().isspace()
                    else "Default Household"
                )
                household = Household(None, user.get_id(), name, [user.get_id()])
                if not household_manager.add_or_update_household(household):
                    log.error("Unable to create default household for user.")

            return jsonify({"username": user.display_name(), "next_url": next_url})
        else:
            return "Login failed", 401

    next_url = request.args.get("next", "/")
    if not is_url_safe(next_url):
        next_url = "/"
    return render_template("login.html", next_url=next_url)


@app.route("/auth", methods=["POST"])
def auth_route():
    """
    This auth method will take a username and password from the client, perform
    the login with Firebase and then forward the refresh and idToken to the
    client. From here the client can handle the login state themselves without
    the server needing to manage any state. This is preferable for an app where
    you don't want to log out a user of the server restarts. Also using
    multiple server instances is not an issues this way (otherwise some kind) of
    distributed memcached would need to be used.
    """
    if request.method != "POST":
        return "", 405

    email = request.form.get("email")
    password = request.form.get("password")
    response = auth_mgr.login(email, password)

    if response.ok:
        uid = response.uid
        user = user_manager.get_user(uid)
        login_user(user)
        log.info("User successfully logged in: %s", user.display_name())

        # Ensure there is at least one household for the user
        households = household_manager.get_households_for_user(user.get_id())
        if len(households) == 0:
            log.warning("No households found for user. Creating one now")
            name = (
                f"{user.display_name()}'s Household"
                if not user.display_name().isspace()
                else "Default Household"
            )
            household = Household(None, user.get_id(), name, [user.get_id()])
            if not household_manager.add_or_update_household(household):
                log.error("Unable to create default household for user.")

        # Send the client the auth tokens and the user's display name
        token_response = {
            "rt": response.refresh_token,
            "it": response.id_token,
            "display_name": user.display_name()
        }
        return jsonify(token_response)
    else:
        msg = f"Login failed for {email}"
        log.info(msg)
        return msg, 401

@app.route("/list_products", methods=["GET", "POST"])
def list_products():
    """
    Lists the products matching the given filters
    """

    # TODO: Add filters
    if request.method != "POST":
        return "", 405

    idToken = request.headers.get("idToken")
    if not idToken or len(idToken) < 10:
        return "idToken missing or invalid format", 400

    log.info(f"/lists_products: Got idToken! {idToken}")
    uid = auth_mgr.user_id_from_token(idToken)
    if uid == None:
        # Might be expired.
        # TODO: Add a way to refresh the token.
        return "Cannot verify id token"
    log.info(f"/lists_products: Got uid! {uid}")

    household = household_manager.get_active_household(uid)
    products = product_mgr.get_household_products(household.id)

    log.info(f"Got {len(products)} products!")

    result = []
    for product in products:
        result.append(
            {
                "product_name": product.product_name,
                "expiration_date": product.expiration_str() if product.does_expire else "No Expiration",
                "location": product.location,
                "product_id": product.id,
                "expired": product.does_expire and product.expires < int(datetime.utcnow().timestamp() * 1000),
                "creation_date": product.creation_str(),
                "wasted": product.wasted,
            }
        )
    return jsonify(result)

# Logout route to clear the user's session
# @app.route("/logout", methods=["POST"])
# def logout():
#     logout_user()
#     return redirect("/")


# @app.route("/settings", methods=["GET", "POST"])
# @login_required
# def settings():
#     user: User = flask_login.current_user
#     try:
#         # Fetch the user's display name and email from Firebase Authentication
#         display_name = user.display_name()
#         email = user.email()
#     except auth.AuthError as e:
#         log.error(f"Error retrieving user information: {e}")
#         display_name = "User"
#         email = "user@example.com"

#     if request.method == "POST":
#         # Handle form submission to update user details
#         new_password = request.form.get("new_password")
#         new_email = request.form.get("new_email")
#         new_name = request.form.get("new_name")

#         # Update user details in Firebase Authentication
#         if new_password:
#             # Handle password update
#             auth.update_user(user.get_id(), password=new_password)
#         if new_email:
#             # Handle email update
#             auth.update_user(user.get_id(), email=new_email)
#         if new_name:
#             # Handle display name update
#             auth.update_user(user.get_id(), display_name=new_name)
#         # Go back to the main page after submitting settings.
#         return redirect("/")
#     households = household_manager.get_households_for_user(user.get_id())
#     return render_template(
#         "settings.html", display_name=display_name, email=email, households=households
#     )


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('idToken')
        if not token:
            logging.error("Token is missing!")
            return jsonify({'message': 'Token is missing!'}), 403
        try:
            decoded_token = auth.verify_id_token(token)
            logging.info(f"Decoded token: {decoded_token}")
            current_user = user_manager.get_user(decoded_token['uid'])
            logging.info(f"Current user: {current_user}")
            flask_login.login_user(current_user)
        except InvalidIdTokenError:
            logging.error("Token is invalid!")
            return jsonify({'message': 'Token is invalid!'}), 403
        except ExpiredIdTokenError:
            logging.error("Token has expired!")
            return jsonify({'message': 'Token has expired!'}), 403
        except Exception as e:
            logging.error(f"Token verification failed: {str(e)}")
            return jsonify({'message': 'Token verification failed!', 'error': str(e)}), 403
        return f(*args, **kwargs)
    return decorated

# Update the route to include the display name
# @app.route("/", methods=["POST", "GET"])
# @login_required
# def index():
#     user: User = flask_login.current_user
#     household: Household = None
#     if user != None:
#         household = household_manager.get_active_household(user.get_id())

#     # Get the current date in the PT timezone
#     current_date = datetime.now(pt_timezone).date()

#     if request.method == "POST":
#         # Get the item content from the form
#         item_content = request.form["product-name"]

#         # Check if the 'No Expiration Date' checkbox is checked
#         no_expiration = "no-expiration" in request.form

#         if not no_expiration:
#             # Parse the expiration date from the form
#             expiration_date_str = request.form["expiration-date"]
#             try:
#                 # Convert the expiration date to UTC timezone
#                 item_expiration_datetime_utc = datetime.strptime(
#                     expiration_date_str, "%Y-%m-%d"
#                 ).replace(tzinfo=pytz.utc)
#                 # Convert the expiration date to PT timezone
#                 item_expiration_datetime_pt = item_expiration_datetime_utc
#                 # Get the date part of the expiration date
#                 item_expiration_date = item_expiration_datetime_pt.date()

#             except ValueError:
#                 # Handle invalid date format here
#                 return render_template(
#                     "error.html", error_message="Invalid date format"
#                 )

#         else:
#             item_expiration_date = None  # No expiration date

#         # Get location, category, and barcode information from the form
#         location = request.form["locations"]
#         category = request.form["category"]
#         barcode_number = request.form["barcode-number"]
#         barcode: Barcode = None

#         if barcode_number != "":
#             barcode = barcodes.get_barcode(barcode_number)

#             # Handle the case when there are no barcode data
#             if barcode is None:
#                 # Add a new barcode
#                 barcode = Barcode(barcode_number, request.form["product-name"])
#                 barcodes.add_barcode(barcode)

#         # Add the code to handle item_expiration_date here
#         if item_expiration_date is not None:
#             expiration_date_str = item_expiration_date.strftime("%d %b %Y")
#         else:
#             expiration_date_str = ""

#         if household == None or household.id == None or household.id.isspace():
#             msg = "Cannot add product: No active household with an ID set."
#             log.error(msg)
#             return msg, 500

#         product = Product(
#             None,
#             barcode=barcode.code if barcode else None,
#             category=category,
#             created=ProductManager.parse_import_date(
#                 datetime.now(pt_timezone).strftime("%d %b %Y")
#             ),
#             expires=(
#                 0
#                 if no_expiration
#                 else ProductManager.parse_import_date(expiration_date_str)
#             ),
#             location=location,
#             product_name=item_content,
#             household_id=household.id,
#             wasted=False,
#             wasted_timestamp=0,
#         )

#         if not product_mgr.add_product(product):
#             return "Unable to add product", 500
#         # Redirect or perform further actions as needed
#         return redirect(url_for("index"))

#     else:
#         # Get filters and parameters from the request
#         location_filter = request.args.get("location-filter", "All")
#         category_filter = request.args.get("category", "All")
#         expiration_date_filter = request.args.get("expiration-date", "")
#         expiration_status_filter = request.args.get("expiration-status", "all")

#         # Reference the 'products' node in Firebase
#         products = product_mgr.get_household_products(household.id)
#         filtered_products: list[Product] = []
#         for product in products:
#             expiration_date = datetime.utcfromtimestamp(product.expires / 1000).date()

#             # Apply filters to select products
#             if (
#                 (location_filter == "All" or product.location == location_filter)
#                 and (category_filter == "All" or product.category == category_filter)
#                 and (
#                     expiration_date_filter == ""
#                     or (
#                         expiration_date
#                         and expiration_date.strftime("%d %b %Y")
#                         == expiration_date_filter
#                     )
#                 )
#                 and (
#                     expiration_status_filter == "all"
#                     or (
#                         expiration_status_filter == "expired"
#                         and expiration_date
#                         and expiration_date <= current_date
#                     )
#                     or (
#                         expiration_status_filter == "not_expired"
#                         and expiration_date
#                         and expiration_date > current_date
#                     )
#                     or (
#                         expiration_status_filter == "not_expiring"
#                         and not expiration_date
#                     )
#                 )
#             ):

#                 product_info = {
#                     "product_id": product.id,
#                     "product_name": product.product_name,
#                     "expiration_date": product.expiration_str(),  # Does "Unknown" still exist?
#                     "location": product.location,
#                     "category": product.category,
#                     "wasted_status": product.wasted,
#                     "expired": (
#                         expiration_date is not None and expiration_date < current_date
#                     ),
#                     "date_created": product.creation_str(),
#                 }
#                 if product_info["wasted_status"] is False:
#                     filtered_products.append(product_info)
#         return render_template(
#             "index.html",
#             display_name=user.display_name(),
#             products=filtered_products,
#             current_date=current_date.strftime("%Y-%m-%d"),
#             selected_location=location_filter,
#             selected_category=category_filter,
#             selected_expiration_date=expiration_date_filter,
#             selected_status=expiration_status_filter,
#             active_household_name=household.name,
#         )


# @app.route("/check_barcode", methods=["POST"])
# @login_required
# def check_barcode():
#     data = request.get_json()
#     barcode_value = data.get("barcode")

#     # Ensure a valid barcode is provided
#     if not barcode_value:
#         response = {"exists": False, "productName": ""}
#         return jsonify(response)

#     # Retrieve barcode data from Firebase
#     barcode = barcodes.get_barcode(barcode_value)
#     if barcode == None:
#         # If the barcode is not found in the database, indicate that it does not exist
#         response = {"exists": False, "productName": ""}
#         return jsonify(response)

#     response = {"exists": True, "productName": barcode.name}
#     return jsonify(response)


# Route to check the expiration status of a product
# @app.route("/check_expiration_status", methods=["GET"])
# @login_required
# def check_expiration_status():
#     current_date = datetime.now(pt_timezone).date()

#     # Get the product's expiration date from the request parameters
#     product = request.args.get("product", None)

#     if product is not None:
#         try:
#             # Parse the product's expiration date from a string to a date object
#             product_expiration_date = datetime.strptime(product, "%Y-%m-%d").date()
#         except ValueError as e:
#             # Handle parsing errors and log them
#             log.error(f"Error parsing product expiration date: {e}")

#         if (
#             product_expiration_date is not None
#             and product_expiration_date <= current_date
#         ):
#             # Handle the case where the product has expired
#             return "Expired"
#         else:
#             # Handle the case where the product has not expired
#             return "Not Expired"

#     # Handle cases where 'product' is None or not provided
#     return "Unknown"


# Route to handle expired date input
# @app.route("/expired_date_input", methods=["POST"])
# @login_required
# def expired_date_input():
#     try:
#         # Get the expiration date as a string from the form data
#         expiration_date_str = request.form["expiration-date"]
#         # Convert the expiration date string to a Python date object
#         item_expiration_date = (
#             datetime.utcnow().strptime(expiration_date_str, "%Y-%m-%d").date()
#         )
#         current_date = datetime.now(pt_timezone).date()
#         # Check if the item's expiration date is not valid
#         if item_expiration_date <= current_date:
#             return jsonify({"valid": False})

#         # Handle the case when the expiration date is valid
#         return jsonify({"valid": True})

#     except Exception as e:
#         return jsonify({"error": str(e)})


# Route to update a product
@app.route("/update_product/<string:id>", methods=["POST"])
@token_required
def update_product(id):
    try:
        data = request.json
        log.info(f"Received update for product {id}: {data}")

        product = product_mgr.get_product(id)
        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        # Update product fields
        product.product_name = data.get('product_name', product.product_name)
        product.location = data.get('location', product.location)
        product.category = data.get('category', product.category)

        expiration_date = data.get('expiration_date')
        if expiration_date:
            try:
                try:
                    # Try parsing the date with the first format
                    product.expires = ProductManager.parse_import_date(expiration_date)
                except ValueError:
                    # If it fails, try the second format
                    product.expires = int(datetime.strptime(expiration_date, "%Y-%m-%d").timestamp() * 1000)
            except ValueError as ve:
                log.error(f"Invalid expiration date format: {expiration_date}, error: {ve}")
                return jsonify({"success": False, "error": "Invalid expiration date format"}), 400

        if not product_mgr.add_product(product):
            log.error(f"Failed to update product {id}")
            return jsonify({"success": False, "error": "Failed to update product"}), 500

        log.info(f"Product {id} successfully updated")
        return jsonify({"success": True})

    except Exception as e:
        log.error(f"Error updating product {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/delete_product/<string:id>", methods=["POST"])
@token_required
def delete_product(id):
    user: User = flask_login.current_user
    success = product_mgr.delete_product(id)
    if not success:
        return jsonify({"success": False, "error": "Unable to delete product"}), 404

    logging.info(f"User {user.get_id()} deleted product {id}")
    return jsonify({"success": True})


# Route to mark a product as wasted
@app.route("/waste_product/<string:id>", methods=["POST"])
@token_required
def waste_product(id):
    user: User = flask_login.current_user
    product = product_mgr.get_product(id)
    if product is None:
        log.error(f"Product with ID {id} not found")
        return jsonify({"success": False, "error": "Product not found"}), 404

    log.info(f"Marking product {product.id} as wasted")
    product.wasted = True
    product.wasted_timestamp = int(datetime.now().timestamp() * 1000)

    if not product_mgr.add_product(product):
        log.error(f"Failed to update product with ID {product.id} in the database")
        return jsonify({"success": False, "error": "Unable to update product to wasted state"}), 500

    log.info(f"Product {product.id} successfully marked as wasted")
    return jsonify({"success": True})


# Route to view the list of wasted products
# @app.route("/wasted_product_list", methods=["GET"])
# @login_required
# def wasted_product_list():
#     user: User = flask_login.current_user
#     household = household_manager.get_active_household(user.get_id(0))
#     # Retrieve all products that are marked as wasted from Firebase
#     wasted_products = []
#     for product in product_mgr.get_household_products(household.id):
#         if product.wasted:
#             expiration_date_str = product.expiration_str()
#             if not expiration_date_str:
#                 expiration_date_str = "Unknown"

#             # Add the 'date_wasted' attribute if it's present in the product_data
#             date_wasted_str = product.wasted_date_str()
#             if not date_wasted_str:
#                 date_wasted_str = "No Wasted Date"

#             wasted_products.append(
#                 {
#                     "product_id": product.id,
#                     "product_name": product.product_name,
#                     "expiration_date": expiration_date_str,
#                     "location": product.location,
#                     "category": product.category,
#                     "wasted_status": product.wasted,
#                     "date_wasted": date_wasted_str,
#                 }
#             )

#     return render_template("wasted_product_list.html", products=wasted_products)


# Route for generating a recipe based on user input
@app.route("/generate_recipe", methods=["POST", "GET"])
@login_required
def generate_recipe_user_input():
    if request.method == "POST":
        user_input = request.form.get("user-input")
        # Assuming generate_recipe accepts a list
        recipe_suggestion = recipe_generator.generate_recipe([user_input])
        return jsonify({"recipe_suggestion": recipe_suggestion})
    else:
        return render_template("generate_recipe.html")


# Route to generate a recipe from the Firebase database
@app.route("/generate_recipe_from_database", methods=["GET"])
@login_required
def generate_recipe_from_database():
    user: User = flask_login.current_user
    household = household_manager.get_active_household(user.get_id())
    today_millis = ProductManager.parse_import_date(
        datetime.now(pt_timezone).strftime("%d %b %Y")
    )
    # Retrieve product names for current user from Firestore.
    product_names = []
    for product in product_mgr.get_household_products(household.id):
        # Ensure the product is neither wasted nor expired.
        if not product.wasted and product.expires >= today_millis:
            product_names.append(product.product_name)

    # Generate a recipe based on the product names
    recipe_suggestion = recipe_generator.generate_recipe(product_names)
    return jsonify({"recipe_suggestion": recipe_suggestion})


# Route for generating a recipe based on user input
@app.route("/update_households", methods=["POST"])
@login_required
def update_households():
    return redirect("/settings")


def is_url_safe(url: str) -> bool:
    return url in [
        "/",
        "/register",
        "/login",
        "/logout",
        "/settings",
        "/generate_recipe",
        "/wasted_product_list",
    ]


# Define a signal handler to handle termination signals
def on_terminate(signal, frame):
    log.info("Received terminate signal at %s" % datetime.now())
    sys.exit(0)


# Initialize and start a schedule thread for sending emails
if not app.debug:
    send_mail.init_schedule_thread()
else:
    log.warning("⚠️ NOT initializing schedule thread in --debug mode ⚠️")

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, port=8081)
