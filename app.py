from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'


# Initialize the database with the settings from our app
db = SQLAlchemy(app)
migrate = Migrate(app, db)


# Create a Model
# Add more items:
# flask db migrate
# flask db upgrade
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    date_wasted = db.Column(db.DateTime, default=datetime.utcnow)
    expiration_date = db.Column(db.Date)
    # Not Wasted = True and Wasted = False
    active_status = db.Column(db.Boolean, default=True)

    # Create a string when a new element is created
    def __repr__(self):
        return f'<Product {self.id}>'


# Route to display the index page
@app.route('/', methods=['POST', 'GET'])
def index():
    if request.method == 'POST':
        item_content = request.form['product-name']
        # Get the expiration date as a string
        expiration_date_str = request.form['expiration-date']
        # Convert to Python date object
        item_expiration_date = datetime.utcnow().strptime(expiration_date_str, '%Y-%m-%d').date()

        if item_expiration_date <= datetime.utcnow().date():
            # Redirect to expired_date_input route
            return redirect(url_for('expired_date_input'))

        new_product = Product(product_name=item_content, expiration_date=item_expiration_date)
        db.session.add(new_product)
        db.session.commit()
        return redirect('/')

    else:
        products = Product.query.filter_by(active_status=True).order_by(Product.date_created).all()
        current_date = datetime.utcnow().strftime('%Y-%m-%d')
        return render_template("index.html", products=products, current_date=current_date)


@app.route('/expired_date_input', methods=['POST'])
def expired_date_input():
    try:
        # Get the expiration date as a string from the form data
        expiration_date_str = request.form['expiration-date']

        # Convert the expiration date string to a Python date object
        item_expiration_date = datetime.utcnow().strptime(expiration_date_str, '%Y-%m-%d').date()

        # Check if the item's expiration date is not valid
        if item_expiration_date <= datetime.utcnow().date():
            return jsonify({'valid': False})

        # Handle the case when the expiration date is valid
        return jsonify({'valid': True})

    except:
        return 'There was an issue with your expiration date'


@app.route('/check_expiration_status')
def check_expiration_status():
    products = Product.query.all()
    current_date = datetime.utcnow().date()

    # Create a dictionary to store the expiration status of each product
    expiration_status = {}

    for product in products:
        if product.expiration_date <= current_date:
            expiration_status[product.id] = 'Expired'
        else:
            expiration_status[product.id] = 'Not Expired'
    return jsonify(expiration_status)


@app.route('/update_product/<int:id>', methods=['GET', 'POST'])
def update_product(id):
    update_product = Product.query.get_or_404(id)

    if request.method == 'POST':
        update_product.product_name = request.form['product-name']

        try:
            db.session.commit()
            return redirect('/')

        except:
            return 'There was an issue updating your product'

    else:
        return render_template('update_product.html', product=update_product)


@app.route('/delete_product/<int:id>')
def delete_product(id):
    delete_product = Product.query.get_or_404(id)

    try:
        db.session.delete(delete_product)
        db.session.commit()
        # Go back were we came from.
        return redirect(request.referrer)
    except:
        return 'There was a problem deleting this product'


@app.route('/waste_product/<int:id>')
def waste_product(id):
    waste_product = Product.query.get_or_404(id)
    waste_product.active_status = False
    try:
        db.session.add(waste_product)
        db.session.commit()
        return redirect('/')
    except:
        return 'There was an issue wasting your product'


@app.route('/wasted_product_list', methods=['GET', 'POST'])
def wasted_product_list():
    products = Product.query.filter_by(active_status=False).order_by(Product.date_created).all()
    return render_template("wasted_product_list.html", products=products)


if __name__ == '__main__':
    app.run(debug=True, port=8011)
