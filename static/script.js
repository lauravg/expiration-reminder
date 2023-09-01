const itemExpirationDate = new Date(expiration_date_str);
const currentDate = new Date();

if (itemExpirationDate <= currentDate) {
  alert('The expiration date must be in the future.', 'alert-danger');
} else {
  const newProduct = new Product({
    productName: item_content,
    expirationDate: itemExpirationDate
  });
}
