document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("myForm");

    // Add an event listener for the form submit event
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        // Get the expiration date value from the input field
        const expirationDate = document.getElementById("input-expiration-date").value;

        // Create a FormData object and add the "expiration-date" field
        const formData = new FormData();
        formData.append('expiration-date', expirationDate);

        // Make a POST request to the /get_expiration_date route with form data
        fetch('/get_expiration_date', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                // Check if 'valid' is false in the JSON response
                if (data.valid === false) {
                    // Show an alert indicating that the expiration date is not valid
                    alert('The expiration date is not valid.');
                } else {
                    // Submit the form if the expiration date is valid
                    form.submit();
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
});