import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens
import Homepage from './Homepage';  // Adjust the path as necessary
import Login from './LoginScreen';  // Adjust the path as necessary
import Registration from './RegistrationScreen';  // Adjust the path as necessary
import AddProductScreen from './AddProductScreen';  // Adjust the path as necessary

import CustomTabBar from './CustomTabBar'; // Import the custom tab bar
import Recipes from './RecipeScreen';
import Settings from './SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ toggleAddProductModal }: { toggleAddProductModal: () => void }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} toggleAddProductModal={toggleAddProductModal} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home'; // Default value to avoid 'used before being assigned' error

          if (route.name === 'Inventory') {
            iconName = 'kitchen';
          } else if (route.name === 'Recipe') {
            iconName = 'restaurant';
          } else if (route.name === 'Health') {
            iconName = 'health-and-safety';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else if (route.name === 'AddProduct') {
            iconName = 'add';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'green',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Inventory" component={Homepage} />
      <Tab.Screen name="Recipe" component={Recipes} />
      <Tab.Screen
        name="AddProduct"
        component={() => null} // We don't actually want to navigate to this screen
        listeners={{
          tabPress: e => {
            e.preventDefault(); // Prevent default action
            toggleAddProductModal(); // Open the modal instead
          },
        }}
      />
      <Tab.Screen name="Health" component={Settings} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);

  const toggleAddProductModal = () => {
    setAddProductModalVisible(!addProductModalVisible);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Registration" component={Registration} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={() => <MainTabs toggleAddProductModal={toggleAddProductModal} />} options={{ headerShown: false }} />
        </Stack.Navigator>
        <StatusBar style="auto" />
        <AddProductScreen visible={addProductModalVisible} onClose={toggleAddProductModal} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
