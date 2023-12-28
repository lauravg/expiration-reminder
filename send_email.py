from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import smtplib
import schedule
import threading
import time
from config import pt_timezone
from recipe import generate_recipe
import firebase_admin
from firebase_admin import credentials, db as firebase_db
from flask import Flask, app
from datetime import datetime


class SendMail:
    def __init__(self, app, flask_app, pt_timezone):
        self.app = app
        self.flask_app = flask_app
        self.pt_timezone = pt_timezone

    def init_schedule_thread(self):
        print('#### inside init_schedule_thread')
        send_mail = self

        class ScheduleThread(threading.Thread):
            @classmethod
            def run(cls):
                schedule.every().day.at('17:27').do(send_mail.send_daily_email)
                # Run the scheduled tasks in a loop
                while True:
                    schedule.run_pending()
                    time.sleep(1)
        schedule_thread = ScheduleThread()
        schedule_thread.start()

    # Define a function to send the email notification

    def email_notification(self, subject, body):
        print('### inside email_notification')
        # Load email configuration from the JSON file
        with open('config.json', 'r') as config_file:
            email_config = json.load(config_file)

        # Configure Email Parameters
        smtp_server = email_config['smtp_server']
        smtp_port = email_config['smtp_port']
        sender_email = email_config['sender_email']
        sender_password = email_config['sender_password']
        receiver_email = email_config['receiver_email']

        # Create an email message
        message = MIMEMultipart()
        message['From'] = sender_email
        message['To'] = receiver_email
        message['Subject'] = subject

        message.attach(MIMEText(body, 'plain'))

        # Establish an SMTP connection and send the email
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, message.as_string())
            print('Email sent successfully.')
        except smtplib.SMTPException as e:
            print(f'SMTP Exception: {str(e)}')
        except Exception as e:
            print(f'Failed to send email: {str(e)}')
        finally:
            server.quit()

    # Define a function to send the daily email
    def send_daily_email(self):
        print('### inside send daily email')
        with self.flask_app.app_context():
            expiring_products = self.get_expiring_products_firebase()

            subject = 'Expiring Products Reminder'
            headline = 'Expiring Products:\n'
            product_details = [
                f'- {product["product_name"]} (Expires in {product["days_until_expiration"]} days on {product["formatted_expiration_date"]})'
                for product in expiring_products]
            body = f'{headline}' + '\n'.join(product_details)

            # Call the generate_recipe function from the recipe module
            recipe_suggestion = generate_recipe([product['product_name'] for product in expiring_products])

            # Add the recipe suggestion to the email body
            if recipe_suggestion:
                body += f'\n\n\n\n\nRecipe Suggestion: {recipe_suggestion}'

            # Send the email
            self.email_notification(subject, body)

    # Define a function to get the list of expiring products
    def get_expiring_products_firebase(self):
        print('### inside get expiring products firebase')
        expiring_products = []

        # Query your Firebase database to retrieve product information
        products_ref = firebase_db.reference('products')
        current_date = datetime.now(self.pt_timezone).date()

        for key, product_data in products_ref.get().items():
            print(f'Type of product_data: {type(product_data)}')
            expiration_date_str = product_data.get('expiration_date', '')  # Get expiration date or an empty string if it doesn't exist
            if expiration_date_str:
                expiration_date = datetime.strptime(expiration_date_str, '%d %b %Y').date()
                days_until_expiration = (expiration_date - current_date).days
                if days_until_expiration <= 5:
                    # Include the product in the list of expiring products
                    product_data['formatted_expiration_date'] = expiration_date.strftime('%d %b %Y')
                    product_data['days_until_expiration'] = days_until_expiration
                    expiring_products.append(product_data)

        return expiring_products
