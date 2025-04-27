from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from absl import logging as log
import json
import smtplib
import schedule
import threading
import time
from config import pt_timezone
from recipe import RecipeGenerator
import firebase_admin
from firebase_admin import credentials, db as firebase_db
from flask import Flask, app
from datetime import datetime


class SendMail:
    def __init__(self, app, flask_app, pt_timezone, recipe_generator: RecipeGenerator):
        self.app = app
        self.flask_app = flask_app
        self.pt_timezone = pt_timezone
        self.recipe_generator = recipe_generator
        self.stop_thread_event = threading.Event()

    def init_schedule_thread(self):
        log.debug('#### inside init_schedule_thread')
        send_mail = self
        evt = self.stop_thread_event
        evt.clear()

        class ScheduleThread(threading.Thread):
            @classmethod
            def run(cls):
                schedule.every().day.at('17:27').do(send_mail.send_daily_email)
                # Run the scheduled tasks in a loop
                while not evt.is_set():
                    schedule.run_pending()
                    time.sleep(1)
                log.info("Stopping thread")
        schedule_thread = ScheduleThread()
        schedule_thread.start()

    def stop_schedule_thread(self):
        self.stop_thread_event.set()

    def email_notification(self, subject, body, receiver_email=None):
        log.debug('### inside email_notification')
        # Load email configuration from individual secret files
        try:
            secrets_dir = '/Users/laura/Projects/PantryGuardian/secrets'
            
            # Read email configuration from individual files
            with open(f'{secrets_dir}/SMTP_SERVER', 'r') as f:
                smtp_server = f.read().strip()
                
            with open(f'{secrets_dir}/SMTP_PORT', 'r') as f:
                smtp_port = int(f.read().strip())
                
            with open(f'{secrets_dir}/SENDER_EMAIL', 'r') as f:
                sender_email = f.read().strip()
                
            with open(f'{secrets_dir}/SMTP_PASSWORD', 'r') as f:
                sender_password = f.read().strip()
            
            # If no specific receiver email is provided, use the sender email as default
            if receiver_email is None:
                receiver_email = sender_email

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
                log.info(f'Email sent successfully to {receiver_email}.')
                return True
            except smtplib.SMTPException as e:
                log.error(f'SMTP Exception: {str(e)}')
                return False
            except Exception as e:
                log.error(f'Failed to send email: {str(e)}')
                return False
            finally:
                if 'server' in locals():
                    server.quit()
        except FileNotFoundError as e:
            log.error(f'Email configuration file not found: {str(e)}')
            return False
        except ValueError as e:
            log.error(f'Invalid value in configuration: {str(e)}')
            return False
        except Exception as e:
            log.error(f'Unexpected error loading email configuration: {str(e)}')
            return False
            
    def send_invitation_email(self, invitation_id, household_name, inviter_name, invitee_email, base_url):
        subject = f"Invitation to join {household_name} on PantryGuardian"
        
        # Create a link with the invitation ID
        invitation_link = f"{base_url}/accept-invitation?id={invitation_id}"
        
        body = f"""Hello,

You have been invited by {inviter_name} to join their household "{household_name}" on PantryGuardian.

To accept this invitation, please click on the following link:
{invitation_link}

This invitation will expire in 7 days.

If you don't have a PantryGuardian account yet, you'll need to create one to join the household.

Thank you,
The PantryGuardian Team
"""
        
        return self.email_notification(subject, body, invitee_email)

    # Define a function to send the daily email
    def send_daily_email(self):
        log.debug('### inside send daily email')
        with self.flask_app.app_context():
            expiring_products = self.get_expiring_products_firebase()

            subject = 'Expiring Products Reminder'
            headline = 'Expiring Products:\n'
            product_details = [
                f'- {product["product_name"]} (Expires in {product["days_until_expiration"]} days on {product["formatted_expiration_date"]})'
                for product in expiring_products]
            body = f'{headline}' + '\n'.join(product_details)

            # Call the generate_recipe function from the recipe module
            recipe_suggestion = self.recipe_generatorgenerate_recipe([product['product_name'] for product in expiring_products])

            # Add the recipe suggestion to the email body
            if recipe_suggestion:
                body += f'\n\n\n\n\nRecipe Suggestion: {recipe_suggestion}'

            # Send the email
            self.email_notification(subject, body)

    # Define a function to get the list of expiring products
    def get_expiring_products_firebase(self):
        log.debug('### inside get expiring products firebase')
        expiring_products = []

        # Query your Firebase database to retrieve product information
        products_ref = firebase_db.reference('products')
        current_date = datetime.now(self.pt_timezone).date()

        for key, product_data in products_ref.get().items():
            log.debug(f'Type of product_data: {type(product_data)}')
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
