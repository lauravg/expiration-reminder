from flask_cors import CORS
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
import firebase_admin.messaging as messaging
from datetime import datetime, timedelta

from firebase_admin import credentials, auth, firestore
from firebase_admin.auth import UserRecord, InvalidIdTokenError, ExpiredIdTokenError
from flask import Flask, jsonify, redirect, render_template, request, url_for
import flask_login
from flask_login import (
    LoginManager,
    login_user,
    logout_user,
    login_required,
    current_user,
)
from apscheduler.schedulers.background import BackgroundScheduler
from auth_manager import AuthManager
from barcode_manager import BarcodeManager, Barcode
from household_manager import Household, HouseholdManager
from product_manager import ProductManager, Product
from recipe import RecipeGenerator
from secrets_manager import SecretsManager
from send_email import SendMail
from user_manager import UserManager, User


def set_logging_params(debug_logging_enabled: bool = False):
    import logging

    fmt = "%(levelname)s %(asctime)s.%(msecs)03d %(filename)s:%(lineno)s: %(message)s"
    formatter = logging.Formatter(fmt, datefmt="%H:%M:%S")
    log.get_absl_handler().setFormatter(formatter)
    log.set_verbosity(log.DEBUG if app.debug else log.INFO)
    log.use_absl_handler()


app = Flask(__name__)
CORS(app)
# Generate a secure secret key for the app, required for session management.
secret_key = secrets.token_urlsafe(16)
app.secret_key = secret_key
app.config.update(SESSION_COOKIE_SECURE=True)

set_logging_params()
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


scheduler = BackgroundScheduler()
# scheduler.start()


# Create an instance of SendMail with the app and pt_timezone
def convert_to_pt(dt):
    return dt.astimezone(pt_timezone).replace(tzinfo=None)


@login_manager.user_loader
def load_user(uid: str) -> User:
    return user_manager.get_user(uid)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        log.info(f"token_required({request.path})")
        token = request.headers.get("idToken")
        if not token:
            log.error("Token is missing!")
            return jsonify({"message": "Token is missing!"}), 401
        try:
            decoded_token = auth.verify_id_token(token)
            current_user = user_manager.get_user(decoded_token["uid"])
            flask_login.login_user(current_user)
        except ExpiredIdTokenError as err:
            log.warn(f"Token has expired: {err}")
            return jsonify({"message": "Token has expired!"}), 401
        except InvalidIdTokenError:
            log.error("Token is invalid!")
            return jsonify({"message": "Token is invalid!"}), 401
        except Exception as e:
            log.error(f"Token verification failed: {str(e)}")
            return (
                jsonify({"message": "Token verification failed!", "error": str(e)}),
                401,
            )
        return f(*args, **kwargs)

    return decorated


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
            set_default_notification_settings(
                user.uid
            )  # Set default notification settings

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


@app.route("/logout", methods=["POST"])
@token_required
def logout():
    """
    Logs out the currently logged-in user.
    """
    try:
        user = flask_login.current_user
        flask_login.logout_user()
        return jsonify({"success": True, "message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/change_password", methods=["POST"])
@login_required
def change_password():
    """
    Change the password of the currently logged-in user.
    """
    try:
        data = request.json
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")

        if not current_password or not new_password:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Check if the new password meets the minimum length requirement
        if len(new_password) < 8:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "New password must be at least 8 characters",
                    }
                ),
                400,
            )

        # Replace this with your logic for password validation
        if not validate_user_password(current_user.id, current_password):  # type: ignore
            return (
                jsonify({"success": False, "error": "Incorrect current password"}),
                401,
            )

        # Update the user's password
        update_user_password(current_user.id, new_password)  # type: ignore
        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


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
    refresh_token = request.form.get("refresh_token")
    response = None
    if email and len(email) > 2 and password and len(password) > 2:
        response = auth_mgr.login(email, password)
    elif refresh_token and len(refresh_token) > 2:
        response = auth_mgr.refresh(refresh_token)
    else:
        msg = "Neither email/password nor refresh_token were given"
        log.warn(msg)
        return msg, 400

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
            "display_name": user.display_name(),
            "user_email": user.email(),
            "user_photo_url": user.photo_url(),
        }
        return jsonify(token_response)
    else:
        msg = f"Login failed for {email}"
        log.info(msg)
        return msg, 401


@app.route("/list_products", methods=["GET", "POST"])
@token_required
def list_products():
    """
    Lists the products matching the given filters
    """

    # TODO: Add filters
    if request.method != "POST":
        log.warning("Bad request method for list_products")
        return jsonify([]), 405

    if "householdId" not in request.json:
        log.warning("householdId not provides for list_products")
        return jsonify([]), 400

    household_id = request.json["householdId"]
    log.info(f"Getting products for household with ID: {household_id}")

    uid = flask_login.current_user.get_id()

    if not household_manager.user_has_household(uid, household_id):
        log.warning("Permission denied for user to list_products for given household")
        return jsonify([]), 401

    products = product_mgr.get_household_products(household_id)

    log.info(f"Got {len(products)} products!")

    result = []
    for product in products:
        result.append(
            {
                "product_name": product.product_name,
                "expiration_date": (
                    product.expiration_str() if product.does_expire else "No Expiration"
                ),
                "location": product.location,
                "product_id": product.id,
                "expired": product.does_expire
                and product.expires < int(datetime.utcnow().timestamp() * 1000),
                "creation_date": product.creation_str(),
                "wasted": product.wasted,
                "note": product.note or "",
            }
        )
    return jsonify(result)


@app.route("/list_households", methods=["POST"])
@token_required
def list_households():
    uid = flask_login.current_user.get_id()
    households = household_manager.get_households_for_user(uid)

    result = []
    for household in households:
        result.append(
            {
                "id": household.id,
                "name": household.name,
                "owner": household.owner_uid == uid,
                # FIXME/TODO: We need to cache this info so we don't have to query all
                #             users every time this request is made.
                "participant_emails": [
                    user_manager.get_user(uid).email() for uid in household.participants
                ],
            }
        )

    return jsonify(result)


def send_push_notification(token, title, body):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
    )
    response = messaging.send(message)
    print("Successfully sent message:", response)


def schedule_notification(user_id, product_name, expiration_date, days_before):
    notification_date = expiration_date - timedelta(days=days_before)
    doc_ref = firestore.collection("users").document(user_id)
    doc = doc_ref.get()
    if doc.exists:
        user_data = doc.to_dict()
        push_token = user_data.get("push_token")
        if push_token:
            scheduler.add_job(
                send_push_notification,
                "date",
                run_date=notification_date,
                args=[
                    push_token,
                    "Product Expiration Alert",
                    f"Your product {product_name} will expire soon!",
                ],
            )


@app.route("/save_notification_settings", methods=["POST"])
@token_required
def save_notification_settings():
    user = flask_login.current_user
    data = request.json
    doc_ref = firestore.collection("users").document(user.get_id())
    doc_ref.update(
        {
            "notification_settings": {
                "notificationsEnabled": data.get("notificationsEnabled", False),
                "daysBefore": data.get("daysBefore", 5),
                "hour": data.get("hour", 12),
                "minute": data.get("minute", 0),
            }
        }
    )
    return jsonify({"success": True})


@app.route("/get_notification_settings", methods=["POST"])
@token_required
def get_notification_settings():
    user = flask_login.current_user
    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        settings = doc.to_dict().get("notification_settings", {})
        return jsonify(
            {
                "notificationsEnabled": settings.get("notificationsEnabled", False),
                "daysBefore": settings.get("daysBefore", 5),
                "hour": settings.get("hour", 12),
                "minute": settings.get("minute", 0),
            }
        )
    else:
        return jsonify(
            {"notificationsEnabled": False, "daysBefore": 5, "hour": 12, "minute": 0}
        )


def set_default_notification_settings(user_id):
    doc_ref = firestore.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists or "notification_settings" not in doc.to_dict():
        default_settings = {
            "notification_settings": {
                "notificationsEnabled": False,
                "daysBefore": 5,
                "hour": 12,
                "minute": 0,
            },
            "view_settings": {
                "sortByProductList": "name",
                "hideExpiredProductList": False,
                "activeFilterProductList": "All",
                "viewModeProductList": "simple",
                "sortByWastedList": "name",
                "hideExpiredWastedList": False,
                "activeFilterWastedList": "All",
                "viewModeWastedList": "simple",
            },
        }
        doc_ref.set(default_settings, merge=True)
        log.info(f"Default settings initialized for user {user_id}")


@app.route("/add_product", methods=["POST"])
@token_required
def add_product():
    try:
        data = request.json

        print(f"Received data: {data}")
        product_data = data.get("product")
        household_id = data.get("householdId")

        if not product_data:
            return jsonify({"success": False, "error": "Product data is required"}), 400
        if not household_id:
            return jsonify({"success": False, "error": "Household ID is required"}), 400

        expiration_date = product_data.get("expiration_date")
        expires = (
            ProductManager.parse_import_date(expiration_date) if expiration_date else 0
        )

        product = Product(
            None,
            barcode=product_data.get("barcode", ""),
            category=product_data.get("category", ""),
            created=int(datetime.utcnow().timestamp() * 1000),
            expires=expires,
            location=product_data.get("location", ""),
            product_name=product_data.get("product_name", ""),
            household_id=household_id,
            wasted=False,
            wasted_timestamp=0,
            note=product_data.get("note", ""),
        )

        if not product_mgr.add_product(product):
            return jsonify({"success": False, "error": "Unable to add product"}), 500

        # Schedule notification
        user = flask_login.current_user
        settings = (
            firestore.collection("users")
            .document(user.get_id())
            .get()
            .to_dict()
            .get("notification_settings", {})
        )
        if settings.get("notificationsEnabled") and expiration_date:
            expiration_date = datetime.strptime(expiration_date, "%Y-%m-%d")
            schedule_notification(
                user.get_id(),
                product.product_name,
                expiration_date,
                settings.get("daysBefore", 5),
            )

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
        product.product_name = data.get("product_name", product.product_name)
        product.location = data.get("location", product.location)
        product.category = data.get("category", product.category)
        product.note = data.get("note", product.note)
        expiration_date = data.get("expiration_date")
        if expiration_date:
            product.expires = ProductManager.parse_import_date(expiration_date)

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

    log.info(f"User {user.get_id()} deleted product {id}")
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
        return (
            jsonify(
                {"success": False, "error": "Unable to update product to wasted state"}
            ),
            500,
        )

    log.info(f"Product {product.id} successfully marked as wasted")
    return jsonify({"success": True})


@app.route("/get_expiring_products", methods=["GET"])
@token_required
def get_expiring_products():
    user = flask_login.current_user
    household = household_manager.get_active_household(user.get_id())
    settings_doc = firestore.collection("users").document(user.get_id()).get()
    settings = settings_doc.to_dict().get("notification_settings", {})
    days_before = settings.get("daysBefore", 5)
    expiring_date = datetime.utcnow() + timedelta(days=days_before)
    expiring_timestamp = int(expiring_date.timestamp() * 1000)

    products = product_mgr.get_household_products(household.id)
    expiring_products = [
        product
        for product in products
        if product.expires > 0 and product.expires <= expiring_timestamp
    ]

    result = [
        {
            "product_name": product.product_name,
            "expiration_date": product.expiration_str(),
            "location": product.location,
            "product_id": product.id,
            "expired": product.expires < int(datetime.utcnow().timestamp() * 1000),
            "creation_date": product.creation_str(),
            "wasted": product.wasted,
            "note": product.note,
        }
        for product in expiring_products
    ]
    return jsonify(result)


@app.route("/generate-recipe", methods=["POST"])
def generate_recipe():
    data = request.json
    ingredients = data.get("ingredients", "")

    if not ingredients:
        return jsonify({"error": "No ingredients provided"}), 400

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {openai}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {
                        "role": "user",
                        "content": f"Generate a recipe using the following ingredients: {ingredients}",
                    },
                ],
                "max_tokens": 150,
            },
        )

        if response.status_code != 200:
            error_message = (
                response.json()
                .get("error", {})
                .get("message", "Failed to generate recipe")
            )
            return jsonify({"error": error_message}), response.status_code

        recipe_content = response.json()["choices"][0]["message"]["content"]
        return jsonify({"recipe": recipe_content})
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": "Failed to generate recipe", "details": str(e)}), 500


# Generate recipe based on database products
@app.route("/generate_recipe_from_database", methods=["GET"])
@token_required
def generate_recipe_from_database():
    user: User = current_user
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


@app.route("/save_push_token", methods=["POST"])
@token_required
def save_push_token():
    user = flask_login.current_user
    data = request.json
    token = data.get("token")
    log.info(f"Saving push token for user: {user.get_id()}")
    doc_ref = firestore.collection("users").document(user.get_id())
    doc_ref.update({"push_token": token})
    log.info(f"Push token saved successfully for user: {user.get_id()}")
    return jsonify({"success": True})


@app.route("/get_locations_categories", methods=["POST"])
@token_required
def get_locations_categories():
    user = flask_login.current_user
    try:
        doc_ref = firestore.collection("users").document(user.get_id())
        doc = doc_ref.get()
        user_data = doc.to_dict() if doc.exists else {}
        locations = user_data.get("locations", [])
        categories = user_data.get("categories", [])
        return jsonify({"locations": locations, "categories": categories}), 200
    except Exception as e:
        log.error(f"Error fetching locations and categories: {e}")
        return jsonify({"error": "Failed to fetch locations and categories"}), 500


@app.route("/add_location", methods=["POST"])
@token_required
def add_location():
    user = flask_login.current_user
    data = request.json
    new_location = data.get("location")
    if not new_location:
        return jsonify({"success": False, "error": "Location is required"}), 400

    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        user_data = doc.to_dict()
        locations = user_data.get("locations", ["Pantry", "Fridge", "Freezer"])
        if new_location not in locations:
            locations.append(new_location)
            doc_ref.update({"locations": locations})
            return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Unable to add location"}), 500


@app.route("/delete_location", methods=["POST"])
@token_required
def delete_location():
    user = flask_login.current_user
    data = request.json
    location_to_delete = data.get("location")
    if not location_to_delete:
        return jsonify({"success": False, "error": "Location is required"}), 400

    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        user_data = doc.to_dict()
        locations = user_data.get("locations", ["Pantry", "Fridge", "Freezer"])
        if location_to_delete in locations:
            locations.remove(location_to_delete)
            doc_ref.update({"locations": locations})
            return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Unable to delete location"}), 500


@app.route("/add_category", methods=["POST"])
@token_required
def add_category():
    user = flask_login.current_user
    data = request.json
    new_category = data.get("category")
    if not new_category:
        return jsonify({"success": False, "error": "Category is required"}), 400

    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        user_data = doc.to_dict()
        categories = user_data.get(
            "categories", ["Veggies", "Fruits", "Baking", "Spices", "Others"]
        )
        if new_category not in categories:
            categories.append(new_category)
            doc_ref.update({"categories": categories})
            return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Unable to add category"}), 500


@app.route("/delete_category", methods=["POST"])
@token_required
def delete_category():
    user = flask_login.current_user
    data = request.json
    category_to_delete = data.get("category")
    if not category_to_delete:
        return jsonify({"success": False, "error": "Category is required"}), 400

    doc_ref = firestore.collection("users").document(user.get_id())
    doc = doc_ref.get()
    if doc.exists:
        user_data = doc.to_dict()
        categories = user_data.get(
            "categories", ["Veggies", "Fruits", "Baking", "Spices", "Others"]
        )
        if category_to_delete in categories:
            categories.remove(category_to_delete)
            doc_ref.update({"categories": categories})
            return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Unable to delete category"}), 500


@app.route("/get_barcode", methods=["POST"])
@token_required
def get_barcode():
    try:
        data = request.json
        barcode = data.get("barcode")
        household_id = data.get("householdId")

        if not barcode:
            return jsonify({"error": "Barcode is required"}), 400
        if not household_id:
            return jsonify({"error": "household_id is required"}), 400

        product_name, is_ext = barcodes.get_product_name(barcode, household_id)
        if product_name:
            return (
                jsonify(
                    {
                        "barcode": barcode,
                        "name": product_name,
                        "ext": is_ext,
                    }
                ),
                200,
            )
        else:
            return jsonify({"error": "Barcode not found"}), 200
    except Exception as e:
        log.error(f"Error in get_barcode: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/add_barcode", methods=["POST"])
@token_required
def add_barcode():
    try:
        data = request.json
        log.info(f"Received data for adding barcode: {data}")
        barcode = data.get("barcode")
        name = data.get("name")
        household_id = data.get("householdId")

        if not barcode or not name or not household_id:
            log.error("Barcode or name or household_id is missing in the request.")
            return (
                jsonify({"error": "Barcode and name and household_id are required"}),
                400,
            )

        # Attempt to add the barcode
        success = barcodes.add_barcode(
            Barcode(barcode, [{"name": name, "source": household_id}])
        )
        if not success:
            log.error("Failed to add barcode to the database.")
            return jsonify({"error": "Failed to add barcode"}), 500

        log.info(f"Barcode {barcode} added successfully with name {name}")
        return jsonify({"success": True}), 200
    except Exception as e:
        log.error(f"Exception occurred while adding barcode: {e}")
        return jsonify({"error": str(e)}), 500


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


@app.route("/save_view_settings", methods=["POST"])
@token_required
def save_view_settings():
    try:
        data = request.json
        user_id = current_user.get_id()

        # Get user document reference
        user_ref = firestore.collection("users").document(user_id)

        # Save view settings in the user's document
        user_ref.set(
            {
                "view_settings": {
                    "sortByProductList": data.get("sortByProductList", "name"),
                    "hideExpiredProductList": data.get("hideExpiredProductList", False),
                    "activeFilterProductList": data.get(
                        "activeFilterProductList", "All"
                    ),
                    "viewModeProductList": data.get("viewModeProductList", "simple"),
                    "sortByWastedList": data.get("sortByWastedList", "name"),
                    "hideExpiredWastedList": data.get("hideExpiredWastedList", False),
                    "activeFilterWastedList": data.get("activeFilterWastedList", "All"),
                    "viewModeWastedList": data.get("viewModeWastedList", "simple"),
                }
            },
            merge=True,
        )

        return jsonify({"success": True}), 200
    except Exception as e:
        log.error(f"Error saving view settings: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/get_view_settings", methods=["POST"])
@token_required
def get_view_settings():
    try:
        user_id = current_user.get_id()

        # Get user document
        user_doc = firestore.collection("users").document(user_id).get()

        if user_doc.exists:
            view_settings = user_doc.to_dict().get("view_settings", {})
            if not view_settings:
                # Return default settings if none exist
                view_settings = {
                    "sortByProductList": "name",
                    "hideExpiredProductList": False,
                    "activeFilterProductList": "All",
                    "viewModeProductList": "simple",
                    "sortByWastedList": "name",
                    "hideExpiredWastedList": False,
                    "activeFilterWastedList": "All",
                    "viewModeWastedList": "simple",
                }
        else:
            # Return default settings if user doc doesn't exist
            view_settings = {
                "sortByProductList": "name",
                "hideExpiredProductList": False,
                "activeFilterProductList": "All",
                "viewModeProductList": "simple",
                "sortByWastedList": "name",
                "hideExpiredWastedList": False,
                "activeFilterWastedList": "All",
                "viewModeWastedList": "simple",
            }

        return jsonify(view_settings), 200
    except Exception as e:
        log.error(f"Error getting view settings: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Initialize and start a schedule thread for sending emails
# if not app.debug:
#     send_mail.init_schedule_thread()
# else:
#     log.warning("⚠️ NOT initializing schedule thread in --debug mode ⚠️")

@app.route("/search_products", methods=["POST"])
@token_required
def search_products():
    """
    Search for product names in the user's household that match the query.
    Returns a list of product suggestions with names and barcodes.
    """
    try:
        data = request.json
        query = data.get("query", "").lower()
        household_id = data.get("householdId")

        if not household_id:
            return jsonify({"error": "Household ID is required"}), 400

        # Check if user has access to this household
        uid = flask_login.current_user.get_id()
        if not household_manager.user_has_household(uid, household_id):
            return jsonify({"error": "Permission denied"}), 401

        # Get all products from the household
        products = product_mgr.get_household_products(household_id)
        
        # Filter products based on query and create unique name-barcode pairs
        suggestions = {}  # Use dict to ensure uniqueness by product name
        for product in products:
            if query in product.product_name.lower():
                # If we already have this product name, only update if this one has a barcode and the existing one doesn't
                if (product.product_name not in suggestions or 
                    (product.barcode and not suggestions[product.product_name]["barcode"])):
                    suggestions[product.product_name] = {
                        "name": product.product_name,
                        "barcode": product.barcode if product.barcode else ""
                    }
        
        # Convert dictionary to list and sort by name
        suggestion_list = sorted(suggestions.values(), key=lambda x: x["name"])
        return jsonify({"suggestions": suggestion_list}), 200

    except Exception as e:
        log.error(f"Error searching products: {e}")
        return jsonify({"error": "Failed to search products"}), 500


# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, port=5050, host="0.0.0.0")
