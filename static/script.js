document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('product-form');

    setupFormSubmitHandler();
    updateExpirationStatus();

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

    function updateExpirationStatus() {
        fetch('/check_expiration_status')
            .then(response => response.json())
            .then(data => {
                // Select all elements with the class "expiration-status"
                const productStatusElements = document.querySelectorAll('.expiration-status');

                // Loop through each element and update its class based on the data
                productStatusElements.forEach(element => {
                    const productId = element.getAttribute('data-product-id');

                    if (data[productId] === true) {
                        element.classList.add('expired');
                    } else {
                        element.classList.remove('expired');
                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    setInterval(updateExpirationStatus, 60000); // 60000 milliseconds = 1 minute

});

// Function to format a date in Pacific Time (PT)
function formatToPacificTime(dateString) {
    const options = {
        timeZone: 'America/Los_Angeles',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
}

// Eventlistener for updateButtons
const updateButtons = document.querySelectorAll('.update-button');
updateButtons.forEach(button => {
    button.addEventListener('click', function () {
        const productId = this.getAttribute('data-product-id');
        // Redirect to the update_product route with the product ID
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
