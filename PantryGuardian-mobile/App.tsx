import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, ActivityIndicator, View } from 'react-native';
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
import { registerForPushNotificationsAsync, scheduleDailyNotification } from './Notifications';
import * as Notifications from 'expo-notifications';
import { SessionData } from './SessionData';
import Requests from './Requests';

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
      <Tab.Screen name="Generate Recipe" component={Recipes} options={{ headerShown: false }} />
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const requests = new Requests();
  const sessionData = new SessionData();

  const toggleAddProductModal = () => {
    setAddProductModalVisible(!addProductModalVisible);
  };

  const handleProductAdded = () => {
    setProductAdded(productAdded + 1); // Increment to trigger reload
  };

  const authenticateAndRegisterForNotifications = async () => {
    try {
      const idToken = sessionData.idToken;
      console.log('Retrieved idToken from AsyncStorage:', idToken);

      if (idToken) {
        const subscription = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
          console.log(notification);
        });

        // Schedule daily notification
        await registerForPushNotificationsAsync(idToken, requests);
        await scheduleDailyNotification(idToken, requests);

        return () => {
          Notifications.removeNotificationSubscription(subscription);
        };
      } else {
        console.error('idToken is missing, cannot proceed with push notification registration.');
      }
    } catch (error) {
      console.error('Error in authenticateAndRegisterForNotifications:', error);
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      const idToken = sessionData.idToken;
      setIsLoading(false);
      if (idToken) {
        handleLoginSuccess();
      }
    };

    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      authenticateAndRegisterForNotifications();
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login"  options={{ headerShown: false }}>
            {(props) => <Login {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
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
        <StatusBar/>
        <AddProductModal
          visible={addProductModalVisible}
          onClose={toggleAddProductModal}
          onProductAdded={handleProductAdded}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
