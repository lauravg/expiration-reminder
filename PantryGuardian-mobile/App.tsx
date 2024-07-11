import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { colors } from './theme';
import Homepage from './Homepage';
import Login from './LoginScreen';
import Registration from './RegistrationScreen';
import AddProductModal from './AddProductModal';
import ProfileScreen from './ProfileScreen';
import CustomTabBar from './CustomTabBar';
import Recipes from './RecipeScreen';
import Settings from './SettingsScreen';
import WastedProducts from './WastedProductScreen';
import Requests, { BASE_URL } from './Requests';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './Product';
import { parse } from 'date-fns';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

type MainTabsProps = {
  toggleAddProductModal: () => void;
  onProductAdded: () => void;
};

function MainTabs({ toggleAddProductModal, onProductAdded }: MainTabsProps) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} toggleAddProductModal={toggleAddProductModal} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home';

          if (route.name === 'Inventory') {
            iconName = 'kitchen';
          } else if (route.name === 'Generate Recipe') {
            iconName = 'restaurant';
          } else if (route.name === 'Wasted') {
            iconName = 'compost';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else if (route.name === 'AddProduct') {
            iconName = 'add';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inventory" options={{ headerShown: false }}>
        {() => <Homepage onProductAdded={onProductAdded} />}
      </Tab.Screen>
      <Tab.Screen name="Generate Recipe" component={Recipes} options={{ headerShown: true }} />
      <Tab.Screen name="AddProduct" options={{ headerShown: false }}>
        {() => null}
      </Tab.Screen>
      <Tab.Screen
        name="Wasted"
        component={WastedProducts}
        options={({ navigation }) => ({
          headerLeft: () => (
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={colors.icon}
              onPress={() => navigation.goBack()}
            />
          ),
          headerTitle: 'Wasted Products',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: colors.primary,
          },
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0, // Remove shadow on Android
            shadowOpacity: 0, // Remove shadow on iOS
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={({ navigation }) => ({
          headerLeft: () => (
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={colors.icon}
              onPress={() => navigation.goBack()}
            />
          ),
          headerTitle: 'Settings',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: colors.primary,
          },
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0, // Remove shadow on Android
            shadowOpacity: 0, // Remove shadow on iOS
          },
        })}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [productAdded, setProductAdded] = useState(0);

  const toggleAddProductModal = () => {
    setAddProductModalVisible(!addProductModalVisible);
  };

  const handleProductAdded = () => {
    setProductAdded(productAdded + 1); // Increment to trigger reload
  };

  useEffect(() => {
    const authenticateAndRegisterForNotifications = async () => {
      await fetchAndSetIdToken();

      if (Requests.idToken) {
        const subscription = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
          console.log(notification);
        });

        // Schedule daily notification
        await registerForPushNotificationsAsync();
        await scheduleDailyNotification();

        return () => {
          Notifications.removeNotificationSubscription(subscription);
        };
      } else {
        console.error('idToken is missing, cannot proceed with push notification registration.');
      }
    };

    authenticateAndRegisterForNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Registration" component={Registration} options={{ headerShown: false }} />
          <Stack.Screen name="Main" options={{ headerShown: false }}>
            {() => <MainTabs toggleAddProductModal={toggleAddProductModal} onProductAdded={handleProductAdded} />}
          </Stack.Screen>
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ navigation }) => ({
              headerLeft: () => (
                <IconButton
                  icon="arrow-left"
                  size={24}
                  iconColor={colors.icon}
                  onPress={() => navigation.goBack()}
                />
              ),
              headerTitle: 'Profile',
              headerTitleStyle: {
                fontWeight: 'bold',
                color: colors.primary,
              },
              headerStyle: {
                backgroundColor: colors.background,
                elevation: 0, // Remove shadow on Android
                shadowOpacity: 0, // Remove shadow on iOS
              },
            })}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
        <AddProductModal
          visible={addProductModalVisible}
          onClose={toggleAddProductModal}
          onProductAdded={handleProductAdded}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Function to fetch and set idToken asynchronously
async function fetchAndSetIdToken() {
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
async function registerForPushNotificationsAsync() {
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
async function fetchExpiringProducts(daysBefore: number): Promise<Product[]> {
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
async function scheduleDailyNotification() {
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
