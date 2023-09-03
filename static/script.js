document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("myForm");

    // Initialize the page
    updateExpirationStatus();
    setupExpirationStatusUpdateTimer();
    setupFormSubmitHandler();

    function updateExpirationStatus() {
        fetch('/check_expiration_status')
            .then(response => response.json())
            .then(data => {
                for (const productId in data) {
                    const productStatusElement = findStatusElement(productId);
                    if (productStatusElement) {
                        productStatusElement.textContent = data[productId];
                        if (productStatusElement.textContent === 'Expired') {
                            productStatusElement.classList.add('expired');
                            productStatusElement.classList.remove('not-expired');
                        } else {
                            productStatusElement.classList.add('not-expired');
                            productStatusElement.classList.remove('expired');
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function findStatusElement(productId) {
        return document.querySelector(`[data-product-id="${productId}"]`);
    }

    function setupExpirationStatusUpdateTimer() {
        // Set up a periodic timer to update the expiration status (e.g., every minute)
        setInterval(updateExpirationStatus, 60000); // 60000 milliseconds = 1 minute
    }

    function setupFormSubmitHandler() {
        if (window.location.pathname === '/') {
            form.addEventListener("submit", function (event) {
                event.preventDefault();

                const expirationDate = document.getElementById("input-expiration-date").value;
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

    function handleFormResponse(data) {
        if (data.valid === false) {
            alert('The expiration date is not valid.');
        } else {
            form.submit();
        }
    }
});
