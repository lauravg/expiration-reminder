// Function to check for Service Worker and Push API support
const check = () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('No Service Worker support!');
  }
  if (!('PushManager' in window)) {
    throw new Error('No Push API Support!');
  }
};

// Function to register the service worker
const registerServiceWorker = async () => {
  try {
    const swRegistration = await navigator.serviceWorker.register('static/sw.js');
    console.log('Service Worker registered with scope:', swRegistration.scope);
    return swRegistration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error; // Rethrow the error for error handling
  }
};

// Function to request notification permission
const requestNotificationPermission = async () => {
  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission not granted for Notification');
  }
};

// Function to show a local notification
const showLocalNotification = (title, body, swRegistration) => {
  console.log('Showing notification:', title, body);
  const options = {
    body,
    // Add more properties like icon, image, vibrate, etc. here.
  };
  swRegistration.showNotification(title, options);
};


// Function to check and notify about product expiration in PT at 2 PM
const checkAndNotifyProduct = async (product, swRegistration) => {
  const expirationDate = new Date(product.expiration_date);
  // Get the UTC time of the expiration date
  const expirationDateUTC = Date.UTC(
    expirationDate.getUTCFullYear(),
    expirationDate.getUTCMonth(),
    expirationDate.getUTCDate(),
    expirationDate.getUTCHours(),
    expirationDate.getUTCMinutes(),
    expirationDate.getUTCSeconds()
  );
  
  // Apply the 'America/Los_Angeles' timezone offset (-7 hours)
  const offset = +7 * 60; // 7 hours * 60 minutes
  const notificationDate = new Date(expirationDateUTC + offset * 60 * 1000);
    
  if (notificationDate !== null) {
    const title = `Product Expiration Reminder: ${product.product_name}`;
    const body = `The product '${product.product_name}' is about to expire on ${expirationDate.toDateString()}. Please check its expiration date.`;
    const notificationTag = `product-expiration-${product.product_name}-${product.id}`;

    // Show a separate notification for each product
    showLocalNotification(title, body, swRegistration, notificationTag);
  }
};



const main = async () => {
  try {
    // Check for Service Worker and Push API support
    check();

    // Register the service worker
    const swRegistration = await registerServiceWorker();

    // Request notification permission
    await requestNotificationPermission();

    // Define the updateExpirationStatus function
    const updateExpirationStatus = () => {
      // Get the current date
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      // Fetch the list of products
      fetch('/get_products_data') // Assuming this endpoint provides product data
        .then(response => response.json())
        .then(data => {
          if (Array.isArray(data.products)) {
            data.products.forEach(product => {
              // Convert the expiration date from the data to a Date object
              const expirationDate = new Date(product.expiration_date);
              // Get the UTC time of the expiration date
              const expirationDateUTC = Date.UTC(
                expirationDate.getUTCFullYear(),
                expirationDate.getUTCMonth(),
                expirationDate.getUTCDate(),
                expirationDate.getUTCHours(),
                expirationDate.getUTCMinutes(),
                expirationDate.getUTCSeconds()
              );
              
              // Apply the 'America/Los_Angeles' timezone offset (-7 hours)
              const offset = 7 * 60; // 7 hours * 60 minutes
              const expirationDatePT = new Date(expirationDateUTC + offset * 60 * 1000);
              // expirationDate.setHours(0, 0, 0, 0);
              // Calculate the date difference in days between the current date and the expiration date
              const dateDifference = Math.floor((expirationDatePT - currentDate) / (24 * 60 * 60 * 1000));
              // Check if the product expires in exactly 2 days
              if (dateDifference <= 2) {
                console.log('yes!')
                // Update the product's expiration status or trigger a notification here
                // You can call your checkAndNotifyProduct function here or perform any other actions
                checkAndNotifyProduct(product, swRegistration);
              }
            });
          } else {
            console.error('Invalid response format. Expected an array of products.');
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    };

    // Run the initial check when the page loads
    updateExpirationStatus();

    // Schedule a daily check for product expiration at 2 PM PT
    setInterval(() => {
      updateExpirationStatus(); // Call the defined function to update product expiration status
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// Run the main function when your application starts
main();
