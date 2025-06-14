import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './Product';
import { parse } from 'date-fns';
import Requests from './Requests';
import { HouseholdManager } from './HouseholdManager';

// Function to request notifications permission and get the token
export async function registerForPushNotificationsAsync(idToken: string, requests: Requests) {
  try {
    console.log('Starting push notification registration');

    if (!idToken) {
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
    await requests.saveNotificationPushToken({ token });
    console.log('Push token saved successfully.');
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
  }
}

// Function to fetch expiring products from the backend
export async function fetchExpiringProducts(
  idToken: string,
  daysBefore: number,
  requests: Requests,
  householdManager: HouseholdManager
): Promise<Product[]> {
  try {
    if (!idToken) {
      throw new Error('idToken is missing');
    }

    const products = await requests.listProducts(await householdManager.getActiveHouseholdId());
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const expiringDate = new Date(today);
    expiringDate.setUTCDate(today.getUTCDate() + daysBefore + 1);

    console.log('Today:', today.toISOString());
    console.log('Expiring Date:', expiringDate.toISOString());
    console.log('Products:', products);

    const expiringProducts = products.filter(product => {
      if (!product.expiration_date || product.expiration_date === "No Expiration" || product.wasted) {
        return false;
      }

      const expirationDate = parseDate(product.expiration_date);

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
  } catch (error) {
    console.error('Failed to fetch products:', error);
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
let isScheduling = false;

export async function scheduleDailyNotification(
  idToken: string,
  requests: Requests,
  householdManager: HouseholdManager
) {
  if (isScheduling) {
    console.log('Notification scheduling is already in progress. Skipping...');
    return;
  }

  try {
    isScheduling = true;

    console.log('Starting notification scheduling...');
    await Notifications.cancelAllScheduledNotificationsAsync(); // Clear existing notifications

    const settings = await fetchNotificationSettings(idToken, requests);
    if (!settings.notificationsEnabled) {
      console.log('Notifications are disabled. No notifications will be scheduled.');
      return;
    }

    const products = await fetchExpiringProducts(
      idToken,
      settings.daysBefore,
      requests,
      householdManager
    );

    const productNames = products.map((product: Product) => product.product_name).join(', ');

    console.log('Scheduling new notification with the following products:', productNames);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Expiring Products Alert",
        body: productNames.length > 0
          ? `The following products are expiring soon: ${productNames}`
          : "No products are expiring soon.",
      },
      trigger: {
        type: 'daily',
        hour: settings.hour,
        minute: settings.minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });

    console.log('Notification scheduled successfully.');
  } catch (error) {
    console.error('Error while scheduling notification:', error);
  } finally {
    isScheduling = false;
  }
}

// Function to fetch notification settings from the backend
async function fetchNotificationSettings(idToken: string, requests: Requests) {
  try {
    if (!idToken) {
      throw new Error('idToken is missing');
    }
    return await requests.getNotificationSettings();
  } catch (error) {
    console.error('Failed to fetch notification settings:', error);
    throw error;
  }
}

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});