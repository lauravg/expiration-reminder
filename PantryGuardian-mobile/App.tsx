import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { colors } from './theme';

// Import screens
import Homepage from './Homepage';
import Login from './LoginScreen';
import Registration from './RegistrationScreen';
import AddProductModal from './AddProductModal';
import AccountDetailsScreen from './AccountDetailsModal';
import CustomTabBar from './CustomTabBar';
import Recipes from './RecipeScreen';
import Settings from './SettingsScreen';
import WastedProducts from './WastedProductScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ toggleAddProductModal }: { toggleAddProductModal: () => void }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} toggleAddProductModal={toggleAddProductModal} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home';

          if (route.name === 'Inventory') {
            iconName = 'kitchen';
          } else if (route.name === 'Recipe') {
            iconName = 'restaurant';
          } else if (route.name === 'Wasted') {
            iconName = 'compost';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else if (route.name === 'AddProduct') {
            iconName = 'add';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Inventory" component={Homepage} options={{ headerShown: false }}/>
      <Tab.Screen name="Recipe" component={Recipes} options={{ headerShown: false }}/>
      <Tab.Screen
        name="AddProduct"
        options={{ headerShown: false }}
      >
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

  const toggleAddProductModal = () => {
    setAddProductModalVisible(!addProductModalVisible);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Registration" component={Registration} options={{ headerShown: false }} />
          <Stack.Screen name="Main" options={{ headerShown: false }}>
            {() => <MainTabs toggleAddProductModal={toggleAddProductModal} />}
          </Stack.Screen>
          <Stack.Screen
            name="AccountDetails"
            component={AccountDetailsScreen}
            options={({ navigation }) => ({
              headerLeft: () => (
                <IconButton
                  icon="arrow-left"
                  size={24}
                  iconColor={colors.icon}
                  onPress={() => navigation.goBack()}
                />
              ),
              headerTitle: 'My Account',
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
        <AddProductModal visible={addProductModalVisible} onClose={toggleAddProductModal} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}