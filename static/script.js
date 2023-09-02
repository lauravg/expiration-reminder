function checkExpirationDate() {
    var expirationDateInput = document.getElementById('expiration_date');
    var currentDate = new Date().toISOString().split('T')[0]; // Get current date in ISO format (yyyy-mm-dd)
    var errorMessage = document.getElementById('error_message').value;
    
    if (expirationDateInput.value < currentDate) {
        if (errorMessage) {
            alert(errorMessage);
        }
        return false; // Prevent form submission
    }
    return true; // Allow form submission
}