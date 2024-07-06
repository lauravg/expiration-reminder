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
openai = secrets_mgr.get_openai_api_key()

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
            set_default_notification_settings(user.uid)  # Set default notification settings

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
        
        # Set default notification settings if not already set
        set_default_notification_settings(uid)  

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


def set_default_notification_settings(user_id):
    doc_ref = firestore.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists or "notification_settings" not in doc.to_dict():
        default_settings = {
            "notification_settings": {
                "notificationsEnabled": False,
                "daysBefore": 5
            }
        }
        doc_ref.set(default_settings, merge=True)


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

@app.route("/add_product", methods=["POST"])
@token_required
def add_product():
    try:
        data = request.json
        log.info(f"Received new product: {data}")

        household = household_manager.get_active_household(flask_login.current_user.get_id())
        if not household:
            return jsonify({"success": False, "error": "No active household found"}), 404

        product = Product(
            None,
            barcode=data.get('barcode', ''),
            category=data.get('category', ''),
            created=int(datetime.utcnow().timestamp() * 1000),
            expires=int(datetime.strptime(data.get('expiration_date'), "%Y-%m-%d").timestamp() * 1000) if data.get('expiration_date') else 0,
            location=data.get('location', ''),
            product_name=data.get('product_name', ''),
            household_id=household.id,
            wasted=False,
            wasted_timestamp=0,
        )

        if not product_mgr.add_product(product):
            return jsonify({"success": False, "error": "Unable to add product"}), 500

        return jsonify({"success": True}), 200

    except Exception as e:
        log.error(f"Error adding product: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


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



@app.route("/generate-recipe", methods=["POST"])
def generate_recipe():
    data = request.json
    ingredients = data.get('ingredients', '')

    if not ingredients:
        return jsonify({'error': 'No ingredients provided'}), 400

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': [
                    {'role': 'system', 'content': 'You are a helpful assistant.'},
                    {'role': 'user', 'content': f'Generate a recipe using the following ingredients: {ingredients}'}
                ],
                'max_tokens': 150
            }
        )

        if response.status_code != 200:
            error_message = response.json().get('error', {}).get('message', 'Failed to generate recipe')
            return jsonify({'error': error_message}), response.status_code

        recipe_content = response.json()['choices'][0]['message']['content']
        return jsonify({'recipe': recipe_content})
    except Exception as e:
        print(f'Exception: {e}')
        return jsonify({'error': 'Failed to generate recipe', 'details': str(e)}), 500

# Route to generate a recipe from the Firebase database
# @app.route("/generate_recipe_from_database", methods=["GET"])
# @login_required
# def generate_recipe_from_database():
#     user: User = flask_login.current_user
#     household = household_manager.get_active_household(user.get_id())
#     today_millis = ProductManager.parse_import_date(
#         datetime.now(pt_timezone).strftime("%d %b %Y")
#     )
#     # Retrieve product names for current user from Firestore.
#     product_names = []
#     for product in product_mgr.get_household_products(household.id):
#         # Ensure the product is neither wasted nor expired.
#         if not product.wasted and product.expires >= today_millis:
#             product_names.append(product.product_name)

#     # Generate a recipe based on the product names
#     recipe_suggestion = recipe_generator.generate_recipe(product_names)
#     return jsonify({"recipe_suggestion": recipe_suggestion})


# Route for generating a recipe based on user input
@app.route("/update_households", methods=["POST"])
@login_required
def update_households():
    return redirect("/settings")

@app.route("/save_notification_settings", methods=["POST"])
@token_required
def save_notification_settings():
    user = flask_login.current_user
    data = request.json
    doc_ref = firestore.collection("users").document(user.get_id())
    doc_ref.update({"notification_settings": data})
    return jsonify({"success": True})

@app.route("/get_notification_settings", methods=["GET"])
@token_required
def get_notification_settings():
    user = flask_login.current_user
    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        return jsonify(doc.to_dict().get("notification_settings", {}))
    else:
        return jsonify({"notificationsEnabled": False, "daysBefore": 5})

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
