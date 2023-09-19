// Register the service worker
// Check for Service Worker and Push API support
const checkServiceWorkerAndPushSupport = () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('No Service Worker support!');
  }
  if (!('PushManager' in window)) {
    throw new Error('No Push API Support!');
  }
};

// Register the service worker
const registerServiceWorker = async () => {
  try {
    const swRegistration = await navigator.serviceWorker.register('static/sw.js');
    console.log('Service Worker registered with scope:', swRegistration.scope);
    return swRegistration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};


// Request notification permission
const requestNotificationPermission = async () => {
  const permission = await window.Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Permission granted for notifications.');
  } else {
    console.error('Permission not granted for notifications.');
  }
};

// Define a function to calculate the time until the next
const scheduleDailyCheck = () => {
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(17, 30, 0, 0);
  let timeUntilDailyCheck = scheduledTime - now;
  // If the scheduled time has already passed for today, schedule it for tomorrow
  if (timeUntilDailyCheck < 0) {
    timeUntilDailyCheck += 24 * 60 * 60 * 1000; // Add 24 hours
  }
  return timeUntilDailyCheck;
};

// Define a function to start the daily check
const startDailyCheck = async () => {
  try {
    // Check for Service Worker and Push API support
    checkServiceWorkerAndPushSupport();

    // Register the service worker
    const swRegistration = await registerServiceWorker();

    requestNotificationPermission();

    // Schedule the next daily check
    setTimeout(() => {
      scheduleDailyNotifications(swRegistration);
      startDailyCheck(); // Schedule the next daily check
    }, scheduleDailyCheck());
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// Create an array to store expiring products
const expiringProducts = [];


// Define a function to update product expiration status
const scheduleDailyNotifications = (swRegistration) => {
  // Get the current date
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Fetch the list of products
  fetch('/get_products_data') // Assuming this endpoint provides product data
    .then((response) => response.json())
    .then((data) => {
      if (Array.isArray(data.products)) {
        data.products.forEach((product) => {
          let dateDifference;
          if (product.product_name) {
            // Convert the expiration date from the data to a Date object
            const expirationDate = new Date(product.expiration_date);
            const expirationDateUTC = Date.UTC(
              expirationDate.getUTCFullYear(),
              expirationDate.getUTCMonth(),
              expirationDate.getUTCDate(),
              expirationDate.getUTCHours(),
              expirationDate.getUTCMinutes(),
              expirationDate.getUTCSeconds()
            );

            // Apply the 'America/Los_Angeles' timezone offset
            const offset = 7 * 60; // 7 hours * 60 minutes
            const expirationDatePT = new Date(expirationDateUTC + offset * 60 * 1000);

            // Calculate the date difference in days between the current date and the expiration date
            dateDifference = Math.floor((expirationDatePT - currentDate) / (24 * 60 * 60 * 1000));

          } else {
            console.error('Invalid product data:', product);
          }
          if (dateDifference <= 2) {

            // Add the product to the list of expiring products
            checkAndNotifyProduct(product, swRegistration);
          }
        });

        // Show a notification for all expiring products
        showExpiringProductsNotification(expiringProducts, swRegistration);

      } else {
        console.error('Invalid response format. Expected an array of products.');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
};
// Check and notify about product expiration
const checkAndNotifyProduct = async (product, swRegistration) => {
  const expirationDate = new Date(product.expiration_date);
  const expirationDateUTC = Date.UTC(
    expirationDate.getUTCFullYear(),
    expirationDate.getUTCMonth(),
    expirationDate.getUTCDate(),
    expirationDate.getUTCHours(),
    expirationDate.getUTCMinutes(),
    expirationDate.getUTCSeconds()
  );
  const offset = 7 * 60; // Offset for 'America/Los_Angeles' timezone
  const notificationDate = new Date(expirationDateUTC + offset * 60 * 1000);

  if (notificationDate !== null) {
    // Calculate the number of days until expiration
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const timeDifference = notificationDate - currentDate;
    const daysUntilExpiration = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    // Check if the product expires in exactly 2 days and hasn't been notified yet
    if (daysUntilExpiration <= 2 && !expiringProducts.includes(product)) {
      // Add the product to the list of expiring products
      expiringProducts.push(product);
      // Check if the service worker is active
      
      if (swRegistration) {
        // Notify about the expiring product
        showLocalNotification('Expiring Product', `Product ${product.product_name} is expiring soon.`, swRegistration);
      } else {
        console.error('Service Worker not active.');
      }
    }
  }
};

// Show a local notification
const showLocalNotification = (title, body, swRegistration) => {
  const options = {
    body,
  };
  // if (expiringProducts.length <= 0) {
  if (swRegistration) {
    swRegistration.showNotification(title, options);
  } else {
    console.error('Service Worker registration not found.');
  }
  // }
};


// Show a notification for all expiring products
const showExpiringProductsNotification = (expiringProducts, swRegistration) => {
  if (expiringProducts.length > 0) {
    // Prepare a summary message for all expiring products
    const title = 'Expiring Products Reminder';

    // Create a list of expiring products with their names and expiration dates
    const productDetails = expiringProducts.map((product) => {
      const expirationDate = new Date(product.expiration_date);
      const currentDate = new Date();
      const timeDifference = expirationDate - currentDate;
      const daysUntilExpiration = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
      const formattedDate = expirationDate.toLocaleDateString();
      return `${product.product_name} (Expires in ${daysUntilExpiration} days on ${formattedDate})`;
    });

    // Show a single notification for all expiring products
    const body = `You have ${expiringProducts.length} products expiring soon:\n${productDetails.join('\n')}`;
    showLocalNotification(title, body, swRegistration);
  }
};


// Main function
const main = async () => {
  try {
    startDailyCheck();

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// Run the main function when your application starts
main();