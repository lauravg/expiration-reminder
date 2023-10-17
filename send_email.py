import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import smtplib
import schedule
import threading
import time
from models import Product, Queries

from recipe import generate_recipe
from flask import Flask


class SendMail:

    def __init__(self, flask_app: Flask, pt_timezone):
        self.flask_app = flask_app
        self.pt_timezone = pt_timezone

    def init_schedule_thread(self):
        send_mail = self

        class ScheduleThread(threading.Thread):
            @classmethod
            def run(cls):
                schedule.every().day.at("17:30").do(send_mail.send_daily_email)
                # Run the scheduled tasks in a loop
                while True:
                    schedule.run_pending()
                    time.sleep(1)
        schedule_thread = ScheduleThread()
        schedule_thread.start()

    # Define a function to send the email notification

    def email_notification(self, subject, body):
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
            print("Email sent successfully.")
        except smtplib.SMTPException as e:
            print(f"SMTP Exception: {str(e)}")
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
        finally:
            server.quit()

    # Define a function to send the daily email

    def send_daily_email(self):
        print('Yo yo yo email')
        with self.flask_app.app_context():
            expiring_products = self.get_expiring_products()

            subject = "Expiring Products Reminder"
            headline = "Expiring Products:\n"
            product_details = [
                f"- {product.product_name} (Expires in {product.days_until_expiration} days on {product.formatted_expiration_date})" for product in expiring_products]
            body = f"{headline}" + '\n'.join(product_details)

            recipe_suggestion = generate_recipe(
                Queries.get_all_product_names())

            # Add the recipe suggestion to the email body
            if recipe_suggestion:
                body += f"\n\n\n\n\nRecipe Suggestion: {recipe_suggestion}"

            # Send the email
            self.email_notification(subject, body)

    # Define a function to get the list of expiring products

    def get_expiring_products(self):
        # Fetch the list of products
        products = Product.query.all()

        # Get the current date
        current_date = datetime.datetime.now(self.pt_timezone).date()

        # Create a list of expiring products
        expiring_products = []
        for product in products:
            if not product.wasted_status:
                expiration_date = product.expiration_date
                days_until_expiration = (expiration_date - current_date).days
                if days_until_expiration <= 5:
                    product.formatted_expiration_date = expiration_date.strftime(
                        '%b %d %Y')
                    product.days_until_expiration = days_until_expiration
                    expiring_products.append(product)

        return expiring_products