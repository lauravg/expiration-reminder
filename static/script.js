document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('product-form');

    setupFormSubmitHandler();

    // Set Up Form Submission Handler
    function setupFormSubmitHandler() {
        if (window.location.pathname === '/') {
            form.addEventListener('submit', function (event) {
                event.preventDefault();

                const expirationDate = document.getElementById('input-expiration-date').value;
                const formData = new FormData();
                formData.append('expiration-date', expirationDate);

                fetch('/expired_date_input', {
                    method: 'POST',
                    body: formData,
                })
                    .then(response => response.json())
                    .then(handleFormResponse)
                    .catch(error => {
                        console.error('Error:', error);
                    });
            });
        }
    }

    // Alert for invalid date input
    function handleFormResponse(data) {
        if (data.valid === false) {
            alert('The expiration date is not valid.');
        } else {
            form.submit();
        }
    }
});


// Eventlistener for updateButtons
const updateButtons = document.querySelectorAll('.update-button');
updateButtons.forEach(button => {
    button.addEventListener('click', function () {
        const productId = this.getAttribute('data-product-id');
        // Redirect to the update_product route with the product ID
        window.location.href = `/update_product/${productId}`;
    });
});

// Eventlistener for delete-button
const deleteButtons = document.querySelectorAll('.delete-button');
deleteButtons.forEach(button => {
    button.addEventListener('click', function () {
        const productId = this.getAttribute('data-product-id');
        // Redirect to the delete_product route with the product ID
        window.location.href = `/delete_product/${productId}`;
    });
});

// Eventlistener for wasteButton
const wasteButtons = document.querySelectorAll('.waste-button');
wasteButtons.forEach(button => {
    button.addEventListener('click', function () {
        const productId = this.getAttribute('data-product-id');
        // Redirect to the waste_product route with the product ID
        window.location.href = `/waste_product/${productId}`;
    });
});

