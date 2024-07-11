// notifications.tsx
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './Product';
import { parse } from 'date-fns';
import Requests, { BASE_URL } from './Requests';

// Function to fetch and set idToken asynchronously
export async function fetchAndSetIdToken() {
  try {
    const idToken = await AsyncStorage.getItem('idToken');
    if (idToken) {
      Requests.idToken = idToken;
      console.log('Fetched idToken from AsyncStorage:', idToken); // Debug log
    } else {
      console.error('idToken not found in AsyncStorage');
    }
  } catch (error) {
    console.error('Failed to fetch idToken:', error);
  }
}

// Function to request notifications permission and get the token
export async function registerForPushNotificationsAsync() {
  try {
    console.log('Starting push notification registration'); // Debug log

    // Ensure Requests.idToken is available
    if (!Requests.idToken) {
      throw new Error('idToken is missing, cannot save push token');
    }

    const projectId = Constants.expoConfig?.extra?.expoProjectId;
    if (!projectId) {
      throw new Error('Expo project ID is not defined.');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Failed to get push token for push notification!');
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId,
    })).data;
    console.log('Push token:', token);
    await AsyncStorage.setItem('expoPushToken', token);

    console.log('Push token:', token);

    // Save push token with idToken
    await axios.post(`${BASE_URL}/save_push_token`, { token }, {
      headers: { 'idToken': Requests.idToken }
    });

    await AsyncStorage.setItem('expoPushToken', token);
    console.log('Push token saved successfully.');
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    // Handle error (e.g., show error message to the user)
  }
}

// Function to fetch expiring products from the backend
export async function fetchExpiringProducts(daysBefore: number): Promise<Product[]> {
  try {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) {
      throw new Error('idToken is missing');
    }

    const response = await axios.post(`${BASE_URL}/list_products`, {}, {
      headers: { 'idToken': idToken }
    });

    if (response.status === 200) {
      const products: Product[] = response.data;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const expiringDate = new Date(today);
      expiringDate.setUTCDate(today.getUTCDate() + daysBefore + 1);

      // Add logging for debugging
      console.log('Today:', today.toISOString());
      console.log('Expiring Date:', expiringDate.toISOString());
      console.log('Products:', products);

      const expiringProducts = products.filter(product => {
        if (!product.expiration_date || product.expiration_date === "No Expiration" || product.wasted) {
          return false;
        }

        const expirationDate = parseDate(product.expiration_date);

        // Validate date
        if (!expirationDate) {
          console.error(`Invalid date for product ${product.product_name}: ${product.expiration_date}`);
          return false;
        }

        expirationDate.setUTCHours(0, 0, 0, 0);
        console.log(`Product: ${product.product_name}, Expiration Date: ${expirationDate.toISOString()}`);
        return expirationDate <= expiringDate && expirationDate >= today;
      });

      console.log('Filtered Expiring Products:', expiringProducts);
      return expiringProducts;
    } else {
      throw new Error('Failed to fetch products');
    }
  } catch (error) {
    console.error('Failed to fetch products', error);
    throw error;
  }
}

// Function to parse date strings in various formats
function parseDate(dateString: string): Date | null {
  const formats = [
    'MMM dd yyyy', // "Jul 01 2027"
    'yyyy-MM-dd',  // "2027-07-01"
    'MM/dd/yyyy',  // "07/01/2027"
  ];

  for (const format of formats) {
    const parsedDate = parse(dateString, format, new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

// Function to schedule daily notifications
export async function scheduleDailyNotification() {
  try {
    console.log('Scheduling daily notifications');

    // Fetch notification settings from the backend
    const settings = await fetchNotificationSettings();

    if (!settings.notificationsEnabled) {
      console.log('Notifications are disabled');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const products = await fetchExpiringProducts(settings.daysBefore);
    const productNames = products.map((product: Product) => product.product_name).join(', ');

    // Add logging for debugging
    console.log('Expiring Products:', productNames);

    const trigger = new Date();
    trigger.setHours(settings.hour);
    trigger.setMinutes(settings.minute);
    trigger.setSeconds(0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Expiring Products Alert",
        body: productNames.length > 0 ? `The following products are expiring soon: ${productNames}` : "No products are expiring soon.",
      },
      trigger: {
        hour: settings.hour,
        minute: settings.minute,
        repeats: true,
      },
    });

    console.log('Notification scheduled successfully');
  } catch (error) {
    console.error('Failed to schedule notification', error);
  }
}

// Function to fetch notification settings from the backend
async function fetchNotificationSettings() {
  try {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) {
      throw new Error('idToken is missing');
    }

    const response = await axios.get(`${BASE_URL}/get_notification_settings`, {
      headers: { 'idToken': idToken }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Failed to fetch notification settings');
    }
  } catch (error) {
    console.error('Failed to fetch notification settings', error);
    throw error;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
