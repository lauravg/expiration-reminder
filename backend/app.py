from flask_cors import CORS
from config import pt_timezone
from datetime import datetime, timedelta
from functools import wraps
import json
import requests
import secrets
import sys
import uuid
import os

from absl import logging as log
import firebase_admin
import firebase_admin.messaging as messaging

from firebase_admin import credentials, auth, firestore, storage
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError
from flask import Flask, jsonify, redirect, request, render_template
import flask_login
from flask_login import (
    LoginManager,
    login_user,
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
from user_manager import UserManager, User
from timing import measure_time


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

firebase_admin.initialize_app(
    cred, {"storageBucket": "pantryguardian-f8381.appspot.com"}
)

firestore = firestore.client()
barcodes = BarcodeManager(firestore)
product_mgr = ProductManager(firestore)
household_manager = HouseholdManager(firestore)

# Create an instance of SendMail with the app and pt_timezone
recipe_generator = RecipeGenerator(secrets_mgr)

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
    user = user_manager.get_user(uid)
    if user is None:
        raise ValueError(f"User with ID {uid} not found")
    return user


@measure_time
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
            log.warning(f"Token has expired: {err}")
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


@app.route("/health", methods=["GET"])
@measure_time
def health():
    try:
        # Check Firebase connection by listing users
        users_ref = firestore.collection("users")
        users = users_ref.limit(2).get()

        # Verify we can get documents from the collection
        if not users:
            error_msg = "Firebase connection error: No users found"
            log.error(error_msg)
            return error_msg, 500
        return "OK", 200
    except Exception as e:
        log.error(f"Health check failed: {str(e)}")
        return f"Health check failed: {str(e)}", 500


@app.route("/version", methods=["GET"])
@measure_time
def version():
    """
    Returns the git hash of the deployed version.
    This is set as an environment variable during deployment.
    """
    git_hash = os.environ.get("GIT_HASH", "unknown")
    return jsonify({"version": git_hash}), 200


# Register route for user registration
@app.route("/register", methods=["POST"])
@measure_time
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


@app.route("/logout", methods=["POST"])
@token_required
@measure_time
def logout():
    """
    Logs out the currently logged-in user.
    """
    try:
        flask_login.logout_user()
        return jsonify({"success": True, "message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/auth", methods=["POST"])
@measure_time
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
@measure_time
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
                "category": product.category,
                "product_id": product.id,
                "expired": product.does_expire
                and product.expires < int(datetime.utcnow().timestamp() * 1000),
                "creation_date": product.creation_str(),
                "wasted": product.wasted,
                "note": product.note or "",
                "image_url": product.image_url,
            }
        )
    return jsonify(result)


@app.route("/list_households", methods=["POST"])
@token_required
@measure_time
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
                "display_names": [
                    user_manager.get_user(uid).display_name()
                    for uid in household.participants
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
@measure_time
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
@measure_time
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


@measure_time
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
@measure_time
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


@app.route("/upload_product_image", methods=["POST"])
@token_required
@measure_time
def upload_product_image():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        image_file = request.files["image"]
        if not image_file.filename:
            return jsonify({"error": "No selected file"}), 400

        # Create a unique filename
        file_extension = os.path.splitext(image_file.filename)[1]
        unique_filename = f"product_images/{str(uuid.uuid4())}{file_extension}"

        # Get Firebase Storage bucket
        bucket = storage.bucket()
        blob = bucket.blob(unique_filename)

        # Upload the file
        blob.upload_from_file(image_file, content_type=image_file.content_type)

        # Make the file publicly accessible
        blob.make_public()

        # Return the public URL
        image_url = blob.public_url
        return jsonify({"image_url": image_url}), 200

    except Exception as e:
        log.error(f"Error uploading image: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Route to update a product
@app.route("/update_product/<string:id>", methods=["POST"])
@token_required
@measure_time
def update_product(id):
    try:
        data = request.json
        log.info(f"Received update for product {id}: {data}")

        product = product_mgr.get_product(id)
        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        # Store the old image URL
        old_image_url = product.image_url
        # Keep existing image_url if not provided in update
        new_image_url = data.get("image_url", old_image_url)

        # Update product fields
        product.product_name = data.get("product_name", product.product_name)
        product.location = data.get("location", product.location)
        product.category = data.get("category", product.category)
        product.note = data.get("note", product.note)
        product.image_url = new_image_url
        expiration_date = data.get("expiration_date")
        if expiration_date:
            product.expires = ProductManager.parse_import_date(expiration_date)

        if not product_mgr.add_product(product):
            log.error(f"Failed to update product {id}")
            return jsonify({"success": False, "error": "Failed to update product"}), 500

        # If the image URL has changed or been removed, delete the old image
        if old_image_url and old_image_url != new_image_url:
            delete_image_from_storage(old_image_url)

        log.info(f"Product {id} successfully updated")
        return jsonify({"success": True})

    except Exception as e:
        log.error(f"Error updating product {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


def delete_image_from_storage(image_url: str | None) -> bool:
    if not image_url:
        return True

    try:
        # Extract filename from URL
        # URL format: https://storage.googleapis.com/pantryguardian-f8381.appspot.com/product_images/filename.jpg
        filename = image_url.split("product_images/")[-1]
        if not filename:
            return False

        bucket = storage.bucket()
        blob = bucket.blob(f"product_images/{filename}")
        blob.delete()
        return True
    except Exception as e:
        log.error(f"Error deleting image from storage: {e}")
        return False


@app.route("/delete_product/<string:id>", methods=["POST"])
@token_required
@measure_time
def delete_product(id):
    # Get the product first to get its image URL
    product = product_mgr.get_product(id)
    if not product:
        return jsonify({"success": False, "error": "Product not found"}), 404

    # Delete the image if it exists
    if product.image_url:
        delete_image_from_storage(product.image_url)

    success = product_mgr.delete_product(id)
    if not success:
        return jsonify({"success": False, "error": "Unable to delete product"}), 404

    log.info(f"User {flask_login.current_user.get_id()} deleted product {id}")
    return jsonify({"success": True})


# Route to mark a product as wasted
@app.route("/waste_product/<string:id>", methods=["POST"])
@token_required
@measure_time
def waste_product(id):
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


@app.route("/generate-recipe", methods=["POST"])
@measure_time
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
@app.route("/generate_recipe_from_database", methods=["POST"])
@token_required
@measure_time
def generate_recipe_from_database():
    data = request.json
    household_id = data.get("householdId")
    if not household_id:
        return jsonify({"error": "Household ID is required"}), 400

    household = household_manager.get_household(household_id)
    if not household:
        return jsonify({"error": "Household not found"}), 404

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
@measure_time
def update_households():
    return redirect("/settings")


@app.route("/save_push_token", methods=["POST"])
@token_required
def save_push_token():
    data = request.json
    token = data.get("token")
    user_id = flask_login.current_user.get_id()
    log.info(f"Saving push token for user: {user_id}")
    doc_ref = firestore.collection("users").document(user_id)
    doc_ref.update({"push_token": token})
    log.info(f"Push token saved successfully for user: {user_id}")
    return jsonify({"success": True})


@app.route("/get_locations_categories", methods=["POST"])
@token_required
@measure_time
def get_locations_categories():
    try:
        user = flask_login.current_user
        data = request.json
        household_id = data.get("householdId")
        if not household_id:
            return jsonify({"error": "household_id is required"}), 400

        # Check if user has access to this household
        if not household_manager.user_has_household(user.get_id(), household_id):
            return (
                jsonify({"error": "User does not have access to this household"}),
                403,
            )

        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"error": "Household not found"}), 404

        return (
            jsonify(
                {"locations": household.locations, "categories": household.categories}
            ),
            200,
        )
    except Exception as e:
        log.error(f"Error getting locations and categories: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/add_location", methods=["POST"])
@token_required
@measure_time
def add_location():
    try:
        user = flask_login.current_user
        data = request.json
        new_location = data.get("location")
        household_id = data.get("householdId")

        if not new_location:
            return jsonify({"success": False, "error": "Location is required"}), 400
        if not household_id:
            return jsonify({"success": False, "error": "household_id is required"}), 400

        # Check if user has access to this household
        if not household_manager.user_has_household(user.get_id(), household_id):
            return (
                jsonify({"error": "User does not have access to this household"}),
                403,
            )

        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if new_location not in household.locations:
            household.locations.append(new_location)
            if household_manager.add_or_update_household(household):
                return jsonify({"success": True}), 200

        return jsonify({"success": False, "error": "Unable to add location"}), 500
    except Exception as e:
        log.error(f"Error adding location: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/delete_location", methods=["POST"])
@token_required
@measure_time
def delete_location():
    try:
        user = flask_login.current_user
        data = request.json
        location_to_delete = data.get("location")
        household_id = data.get("householdId")

        if not location_to_delete:
            return jsonify({"success": False, "error": "Location is required"}), 400
        if not household_id:
            return jsonify({"success": False, "error": "household_id is required"}), 400

        # Check if user has access to this household
        if not household_manager.user_has_household(user.get_id(), household_id):
            return (
                jsonify({"error": "User does not have access to this household"}),
                403,
            )

        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if location_to_delete in household.locations:
            household.locations.remove(location_to_delete)
            if household_manager.add_or_update_household(household):
                return jsonify({"success": True}), 200

        return jsonify({"success": False, "error": "Unable to delete location"}), 500
    except Exception as e:
        log.error(f"Error deleting location: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/add_category", methods=["POST"])
@token_required
@measure_time
def add_category():
    try:
        user = flask_login.current_user
        data = request.json
        new_category = data.get("category")
        household_id = data.get("householdId")

        if not new_category:
            return jsonify({"success": False, "error": "Category is required"}), 400
        if not household_id:
            return jsonify({"success": False, "error": "household_id is required"}), 400

        # Check if user has access to this household
        if not household_manager.user_has_household(user.get_id(), household_id):
            return (
                jsonify({"error": "User does not have access to this household"}),
                403,
            )

        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if new_category not in household.categories:
            household.categories.append(new_category)
            if household_manager.add_or_update_household(household):
                return jsonify({"success": True}), 200

        return jsonify({"success": False, "error": "Unable to add category"}), 500
    except Exception as e:
        log.error(f"Error adding category: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/delete_category", methods=["POST"])
@token_required
@measure_time
def delete_category():
    try:
        user = flask_login.current_user
        data = request.json
        category_to_delete = data.get("category")
        household_id = data.get("householdId")

        if not category_to_delete:
            return jsonify({"success": False, "error": "Category is required"}), 400
        if not household_id:
            return jsonify({"success": False, "error": "household_id is required"}), 400

        # Check if user has access to this household
        if not household_manager.user_has_household(user.get_id(), household_id):
            return (
                jsonify({"error": "User does not have access to this household"}),
                403,
            )

        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if category_to_delete in household.categories:
            household.categories.remove(category_to_delete)
            if household_manager.add_or_update_household(household):
                return jsonify({"success": True}), 200

        return jsonify({"success": False, "error": "Unable to delete category"}), 500
    except Exception as e:
        log.error(f"Error deleting category: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/get_barcode", methods=["POST"])
@token_required
@measure_time
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
@measure_time
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
@measure_time
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
@measure_time
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


@app.route("/search_products", methods=["POST"])
@token_required
@measure_time
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
                if product.product_name not in suggestions or (
                    product.barcode and not suggestions[product.product_name]["barcode"]
                ):
                    suggestions[product.product_name] = {
                        "name": product.product_name,
                        "barcode": product.barcode if product.barcode else "",
                    }

        # Convert dictionary to list and sort by name
        suggestion_list = sorted(suggestions.values(), key=lambda x: x["name"])
        return jsonify({"suggestions": suggestion_list}), 200

    except Exception as e:
        log.error(f"Error searching products: {e}")
        return jsonify({"error": "Failed to search products"}), 500


@app.route("/delete_account", methods=["POST"])
@token_required
@measure_time
def delete_account():
    """
    Delete the user's account after verifying their password.
    """
    try:
        data = request.json
        password = data.get("password")

        if not password:
            return jsonify({"success": False, "error": "Password is required"}), 400

        user = current_user
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        # Verify the password using Firebase Auth REST API
        firebase_web_api_key = secrets_mgr.get_firebase_web_api_key()
        request_data = {
            "email": user.email(),
            "password": password,
            "returnSecureToken": True,
        }

        response = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_web_api_key}",
            json=request_data,
        )

        if not response.ok:
            return jsonify({"success": False, "error": "Invalid password"}), 401

        # Password is correct, proceed with account deletion
        try:
            # Delete user's data from Firestore
            user_id = user.get_id()

            # Get user's households
            households = household_manager.get_households_for_user(user_id)

            # Delete owned households
            for household in households:
                if household.owner_uid == user_id:
                    household_manager.delete_household(household.id, user_id)

            # Delete the user from Firebase Auth
            auth.delete_user(user_id)

            return jsonify({"success": True}), 200

        except Exception as e:
            log.error(f"Error deleting user account: {e}")
            return jsonify({"success": False, "error": "Failed to delete account"}), 500

    except Exception as e:
        log.error(f"Error in delete_account: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/reset_password", methods=["POST"])
@measure_time
def reset_password():
    """
    Send a password reset email to the user using Firebase Auth REST API.
    """
    try:
        data = request.json
        email = data.get("email")

        if not email:
            return jsonify({"success": False, "error": "Email is required"}), 400

        try:
            # Use Firebase web API key to send reset email directly
            firebase_web_api_key = secrets_mgr.get_firebase_web_api_key()
            reset_url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={firebase_web_api_key}"

            payload = {"requestType": "PASSWORD_RESET", "email": email}

            response = requests.post(reset_url, json=payload)

            if response.status_code == 200:
                log.info(f"Password reset email sent to {email}")
                return jsonify({"success": True}), 200
            else:
                error_message = (
                    response.json().get("error", {}).get("message", "Unknown error")
                )
                log.error(f"Error sending password reset email: {error_message}")
                return (
                    jsonify({"success": False, "error": "Failed to send reset email"}),
                    500,
                )

        except Exception as e:
            log.error(f"Error sending password reset email: {e}")
            return (
                jsonify({"success": False, "error": "Failed to send reset email"}),
                500,
            )

    except Exception as e:
        log.error(f"Error in reset_password: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/create_household", methods=["POST"])
@token_required
@measure_time
def create_household():
    try:
        user = flask_login.current_user
        data = request.json
        name = data.get("name")

        if not name:
            return (
                jsonify({"success": False, "error": "Household name is required"}),
                400,
            )

        # Create new household with current user as owner and participant
        household = Household(None, user.get_id(), name, [user.get_id()])
        if not household_manager.add_or_update_household(household):
            return (
                jsonify({"success": False, "error": "Failed to create household"}),
                500,
            )

        return jsonify({"success": True}), 200
    except Exception as e:
        log.error(f"Error creating household: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/delete_household", methods=["POST"])
@token_required
@measure_time
def delete_household():
    try:
        user = flask_login.current_user
        data = request.json
        household_id = data.get("id")

        if not household_id:
            return jsonify({"success": False, "error": "Household ID is required"}), 400

        # Get the household
        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        # Check if user is the owner
        if household.owner_uid != user.get_id():
            return (
                jsonify(
                    {"success": False, "error": "Only the owner can delete a household"}
                ),
                403,
            )

        # Delete the household
        if household_manager.delete_household(household_id, user.get_id()):
            return jsonify({"success": True}), 200
        else:
            return (
                jsonify({"success": False, "error": "Failed to delete household"}),
                500,
            )

    except Exception as e:
        log.error(f"Error deleting household: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/get_last_active_household", methods=["POST"])
@token_required
@measure_time
def get_last_active_household():
    try:
        uid = flask_login.current_user.get_id()
        # Get the last active household from the user's document
        user_doc = firestore.collection("users").document(uid).get()
        if user_doc.exists:
            last_active_household = user_doc.get("last_active_household")
            if last_active_household:
                # Verify the household still exists and user has access
                household = household_manager.get_household(last_active_household)
                if household and uid in household.participants:
                    return jsonify({"household_id": last_active_household})
        return jsonify({"household_id": None})
    except Exception as e:
        log.error(f"Error getting last active household: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/set_active_household", methods=["POST"])
@token_required
@measure_time
def set_active_household():
    try:
        uid = flask_login.current_user.get_id()
        data = request.json
        household_id = data.get("household_id")

        if not household_id:
            return jsonify({"success": False, "error": "Household ID is required"}), 400

        # Verify the household exists and user has access
        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if uid not in household.participants:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "User does not have access to this household",
                    }
                ),
                403,
            )

        # Update the last active household in the user's document
        firestore.collection("users").document(uid).set(
            {"last_active_household": household_id}, merge=True
        )

        return jsonify({"success": True})
    except Exception as e:
        log.error(f"Error setting active household: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/update_profile", methods=["POST"])
@token_required
@measure_time
def update_profile():
    try:
        user = flask_login.current_user
        data = request.json
        display_name = data.get("display_name")

        if not display_name:
            return jsonify({"success": False, "error": "Display name is required"}), 400

        # Update the user's display name in Firebase Auth
        auth.update_user(user.get_id(), display_name=display_name)

        log.info(f"User {user.get_id()} updated display name to: {display_name}")
        return jsonify({"success": True}), 200

    except Exception as e:
        log.error(f"Error updating profile: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/invite_to_household", methods=["POST"])
@token_required
@measure_time
def invite_to_household():
    try:
        user = flask_login.current_user
        data = request.json
        household_id = data.get("household_id")
        invitee_email = data.get("email")

        if not household_id:
            return jsonify({"success": False, "error": "Household ID is required"}), 400

        if not invitee_email:
            return (
                jsonify({"success": False, "error": "Invitee email is required"}),
                400,
            )

        # Verify the user is a member of the household
        household = household_manager.get_household(household_id)
        if not household:
            return jsonify({"success": False, "error": "Household not found"}), 404

        if user.get_id() not in household.participants:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "You are not a member of this household",
                    }
                ),
                403,
            )

        # Create an invitation
        invitation = household_manager.create_invitation(
            household_id, user.get_id(), invitee_email
        )
        if not invitation:
            return (
                jsonify({"success": False, "error": "Failed to create invitation"}),
                500,
            )

        # TODO: Send the invitation email
        return (
            jsonify(
                {
                    "success": True,
                    "invitation_id": invitation.id,
                    "email_sent": False,
                }
            ),
            200,
        )

    except Exception as e:
        log.error(f"Error inviting to household: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/accept_invitation/<string:invitation_id>", methods=["POST"])
@token_required
@measure_time
def accept_invitation_endpoint(invitation_id):
    try:
        user = flask_login.current_user
        uid = user.get_id()

        # Get the invitation
        invitation = household_manager.get_invitation(invitation_id)
        if not invitation:
            return jsonify({"success": False, "error": "Invitation not found"}), 404

        # Verify the invitation is for this user's email
        if invitation.invitee_email != user.email():
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This invitation is not for your email address",
                    }
                ),
                403,
            )

        # Accept the invitation
        if not household_manager.accept_invitation(invitation_id, uid):
            return (
                jsonify({"success": False, "error": "Failed to accept invitation"}),
                500,
            )

        return jsonify({"success": True, "household_id": invitation.household_id}), 200

    except Exception as e:
        log.error(f"Error accepting invitation: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/reject_invitation/<string:invitation_id>", methods=["POST"])
@token_required
@measure_time
def reject_invitation_endpoint(invitation_id):
    try:
        user = flask_login.current_user

        # Get the invitation
        invitation = household_manager.get_invitation(invitation_id)
        if not invitation:
            return jsonify({"success": False, "error": "Invitation not found"}), 404

        # Verify the invitation is for this user's email
        if invitation.invitee_email != user.email():
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This invitation is not for your email address",
                    }
                ),
                403,
            )

        # Reject the invitation
        if not household_manager.reject_invitation(invitation_id):
            return (
                jsonify({"success": False, "error": "Failed to reject invitation"}),
                500,
            )

        return jsonify({"success": True}), 200

    except Exception as e:
        log.error(f"Error rejecting invitation: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/get_pending_invitations", methods=["POST"])
@token_required
@measure_time
def get_pending_invitations():
    try:
        user = flask_login.current_user
        email = user.email()

        # Get all pending invitations for this user's email
        invitations = household_manager.get_invitations_for_email(email)

        # Format the response
        invitation_list = []
        for invitation in invitations:
            # Get inviter's name
            inviter = user_manager.get_user(invitation.inviter_uid)
            inviter_name = inviter.display_name() if inviter else "Unknown"

            invitation_list.append(
                {
                    "id": invitation.id,
                    "household_id": invitation.household_id,
                    "household_name": invitation.household_name,
                    "inviter_uid": invitation.inviter_uid,
                    "inviter_name": inviter_name,
                    "created_at": invitation.created_at,
                }
            )

        return jsonify({"success": True, "invitations": invitation_list}), 200

    except Exception as e:
        log.error(f"Error getting pending invitations: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/", methods=["GET"])
@measure_time
def index():
    num_households = household_manager.num_households()
    num_users = user_manager.num_users()
    num_items = product_mgr.num_products()

    return render_template(
        "index.html",
        num_households=num_households,
        num_users=num_users,
        num_items=num_items,
    )


# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, port=5050, host="0.0.0.0")
