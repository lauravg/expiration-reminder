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
  const swRegistration = await navigator.serviceWorker.register('static/sw.js');
  return swRegistration;
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
  const options = {
    body,
    // Add more properties like icon, image, vibrate, etc. here.
  };
  swRegistration.showNotification(title, options);
};

// Function to calculate the notification date before expiration
const calculateNotificationDate = (expirationDate, daysBefore) => {
  const notificationDate = new Date(expirationDate);
  notificationDate.setHours(0, 0, 0, 0);
  notificationDate.setDate(expirationDate.getDate() - daysBefore);
  return notificationDate;
};

// Create a Date object representing the current date at midnight
const currentDateUTC = new Date();
currentDateUTC.setHours(0, 0, 0, 0);

// Function to check and notify about product expiration
const checkAndNotifyProduct = async (product, swRegistration) => {
  const expirationDate = new Date(product.expiration_date);
  const notificationFiveDaysBefore = calculateNotificationDate(expirationDate, 5);
  const notificationThreeDaysBefore = calculateNotificationDate(expirationDate, 3);
  const notificationOneDayBefore = calculateNotificationDate(expirationDate, 1);

  // Check if the current date matches any of the notification dates
  if (
    currentDateUTC.toISOString() == notificationFiveDaysBefore.toISOString() ||
    currentDateUTC.toISOString() == notificationThreeDaysBefore.toISOString() ||
    currentDateUTC.toISOString() == notificationOneDayBefore.toISOString()
  ) {
    const title = `Product Expiration Reminder: ${product.product_name}`;
    const body = `The product '${product.product_name}' is about to expire on ${expirationDate.toDateString()}. Please check its expiration date.`;
    showLocalNotification(title, body, swRegistration);
  }
};

// Main function
const main = async () => {
  // Check for Service Worker and Push API support
  check();

  // Register the service worker
  const swRegistration = await registerServiceWorker();

  // Request notification permission
  await requestNotificationPermission();

  // Function to run checks at midnight
  const runCheckAtMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight - now;

    setTimeout(async () => {
      try {
        // Fetch product data from the server
        const productsResponse = await fetch('/get_products_data'); // Replace with your actual endpoint
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch product data');
        }

        const productsData = await productsResponse.json();

        // Iterate through products and check for expiration
        for (const product of productsData.products) {
          await checkAndNotifyProduct(product, swRegistration);
        }
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        runCheckAtMidnight(); // Schedule the next check at midnight
      }
    }, timeUntilMidnight);
  };

  // Start the initial check at midnight
  runCheckAtMidnight();
};

// Run the main function
main();