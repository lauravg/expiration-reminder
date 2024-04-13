function millisToUTCDateFormatted(millis) {
  // Create a new Date object in UTC using Date.UTC
  const dateObj = new Date(Date.UTC(new Date(millis).getUTCFullYear(),
                                   new Date(millis).getUTCMonth(),
                                   new Date(millis).getUTCDate(),
                                   new Date(millis).getUTCHours(),
                                   new Date(millis).getUTCMinutes(),
                                   new Date(millis).getUTCSeconds(),
                                   new Date(millis).getUTCMilliseconds()));

  // Get year, month, and day values (adding 1 to month since it starts at 0)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  // Format the date string in "yyyy-MM-dd"
  return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('product-form');
    const expirationDateInput = document.getElementById('input-expiration-date');
    const noExpirationCheckbox = document.getElementById('no-expiration');

    // setupFormSubmitHandler();
    // updateExpirationStatus();

    // // Set Up Form Submission Handler
    //     if (window.location.pathname === '/') {
    //         form.addEventListener('submit', function (event) {
    //             event.preventDefault();

    //             const expirationDate = document.getElementById('input-expiration-date').value;
    //             const formData = new FormData();
    //             formData.append('expiration-date', expirationDate);
    //             // Send data to your server (Flask) for further processing
    //             const url = `/get_products_data?expiration-date=${encodeURIComponent(expirationDate)}`;

    //             // Send data to your server (Flask) with a GET request using query parameters
    //             fetch(url, {
    //                 method: 'GET',  // Use the GET method
    //             })
    //             .then(response => response.json())
    //             .then(product_data => {
    //                 console.log('Response:', product_data);
    //                 handleFormResponse(product_data);
    //             })
    //             .catch(error => {
    //                 console.error('Error:', error);
    //             });
    //         });
    //     }
    // }


    // // Alert for invalid date input
    // function handleFormResponse(data) {
    //     if (data.valid === false) {
    //         alert('The expiration date is not valid.');
    //     } else {
    //         form.submit();
    //     }
    // }

    // Function to fetch and update expiration status
    // function updateExpirationStatus() {
    //     fetch('/get_products_data') // Assuming this route returns product data
    //         .then(response => response.json())
    //         .then(data => {
    //             const products = data.products;

    //             // Select all elements with the class 'expiration-status'
    //             const productStatusElements = document.querySelectorAll('.expiration-status');

    //             productStatusElements.forEach(element => {
    //                 const productId = element.getAttribute('data-product-id');

    //                 // Find the product by ID
    //                 const product = products.find(product => product.product_id === productId);

    //                 if (product) {
    //                     if (product.expiration_status) {
    //                         element.classList.add('expired');
    //                     } else {
    //                         element.classList.remove('expired');
    //                     }
    //                 }
    //             });
    //         })
    //         .catch(error => {
    //             console.error('Error:', error);
    //         });
    // }

    // setInterval(updateExpirationStatus, 60000); // 60000 milliseconds = 1 minute

    // Listen for changes to the 'No Expiration Date' checkbox
    if (noExpirationCheckbox != undefined) {
      // Disable initially
      if (noExpirationCheckbox.checked) {
        expirationDateInput.disabled = true;
      }
      noExpirationCheckbox.addEventListener('change', function () {
          if (this.checked) {
              // If checked, disable the expiration date input and clear its value
              expirationDateInput.disabled = true;
              expirationDateInput.value = '';
          } else if (!this.checked) {
              // If unchecked, enable the expiration date input
              expirationDateInput.disabled = false;
              // Get the current date as a string in 'YYYY-MM-DD' format
              const currentDate = new Date();
              const year = currentDate.getFullYear();
              const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
              const day = currentDate.getDate().toString().padStart(2, '0');
              const formattedDate = `${year}-${month}-${day}`;

              // Set the value of the expirationDateInput to the current date
              expirationDateInput.value = formattedDate;
          } else {
              // If unchecked, enable the expiration date input
              expirationDateInput.disabled = false;
          }
      });
    }

});


    // Eventlistener for updateButtons
    const updateButtons = document.querySelectorAll('.update-button');
    updateButtons.forEach(button => {
        button.addEventListener('click', function () {
            const productId = this.getAttribute('data-product-id');
            window.location.href = `/update_product/${productId}`;
        });
    });

    // Event listener for delete-button
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            const productId = this.getAttribute('data-product-id');
            // Redirect to the delete_product route with the product ID
            window.location.href = `/delete_product/${productId}`;
        });
    });

    // Event listener for wasteButton
    const wasteButtons = document.querySelectorAll('.waste-button');
    wasteButtons.forEach(button => {
        button.addEventListener('click', function () {
            const productId = this.getAttribute('data-product-id');
            // Redirect to the waste_product route with the product ID
            window.location.href = `/waste_product/${productId}`;
        });
    });

    let clearFilterBtn = document.getElementById('clear-filter-button');
    if (clearFilterBtn != undefined) {
      clearFilterBtn.addEventListener('click', function () {
          // Redirect to the same page without any filter query parameters
          window.location.href = '/';  // Change this URL to match your route
      });
    }