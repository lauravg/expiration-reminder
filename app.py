from curses import flash
from flask import Flask, redirect, render_template, request
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
    # flask db migrate -m "Text"
    # flask db upgrade
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    expiration_date = db.Column(db.Date)
    status = db.Column(db.Boolean, default=True)

    # Create a string when a new element is created
    def __repr__(self):
        return f'<Product {self.id}>'


# Route to display the index page
@app.route('/', methods=['POST', 'GET'])
def index():
    if request.method == 'POST':
        item_content = request.form['product_name']
        # Get the expiration date as a string
        expiration_date_str = request.form['expiration_date']
         # Convert to Python date object
        item_expiration_date = datetime.utcnow().strptime(expiration_date_str, '%Y-%m-%d').date()
        # True = Active and False = Wasted
        item_status = request.form['status']
        
        if item_expiration_date <=  datetime.utcnow().date():
           flash('The expiration date must be in the future.', 'alert-danger')
        new_product = Product(product_name=item_content, expiration_date=item_expiration_date, status=item_status)

        try:
            db.session.add(new_product)
            db.session.commit()
            return redirect('/')
        except:
            return 'There was an issue adding your product'
    else:
        products = Product.query.order_by(Product.date_created).all()
        current_date = datetime.utcnow().strftime('%Y-%m-%d')
        return render_template("index.html", products=products, current_date=current_date)

if __name__ == '__main__':
    app.run(debug=True, port=8011)


@app.route('/delete_product/<int:id>')
def delete_product(id):
    delete_product = Product.query.get_or_404(id)

    try:
        db.session.delete(delete_product)
        db.session.commit()
        return redirect('/')
    except:
        return 'There was a problem deleting this product'


@app.route('/update_product/<int:id>', methods=['GET', 'POST'])
def update_product(id):
    product = Product.query.get_or_404(id)
    
    if request.method ==  'POST':
        product.product_name = request.form['product_name']

        try:
            db.session.commit()
            return redirect('/')
        
        except:
            return 'There was an issue updating your product'

    else:
        return render_template('update_product.html', product=product)


@app.route('/waste_product/<int:id>', methods=['GET', 'POST'])
def waste_product(id):
    product = Product.query.get_or_404(id)
    product.status = False
    
    try:
        db.session.commit()
        return redirect('/')
        
    except:
        return 'There was an issue updating your product'


# @app.route('/move_to_wasted/<int:id>', methods=['GET'])
# def move_to_wasted(id):
#     product = Product.query.get_or_404(id)
#     # TODO

