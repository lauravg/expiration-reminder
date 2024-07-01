import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { format, isValid, parse, addDays, differenceInDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';

interface HomepageProps {
  onProductAdded: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onProductAdded }) => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [products, setProducts] = useState<Product[]>([]);
  const displayName = Requests.displayName;

  const requests = new Requests();

  const handleDelete = async (product: Product) => {
    const success = await requests.deleteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
    } else {
      console.error('Failed to delete product');
    }
  };

  const handleWaste = async (product: Product) => {
    const success = await requests.wasteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
    } else {
      console.error('Failed to mark product as wasted');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const success = await requests.updateProduct(updatedProduct);
    if (success) {
      setProducts(products.map(p => p.product_id === updatedProduct.product_id ? updatedProduct : p));
    } else {
      console.error('Failed to update product');
    }
  };

  const scheduleNotification = async (product: Product) => {
    const notificationsEnabled = JSON.parse(await AsyncStorage.getItem('notificationsEnabled') || 'false');
    if (!notificationsEnabled) return;

    const daysBefore = parseInt(await AsyncStorage.getItem('daysBefore') || '5', 10);

    if (product.expiration_date) {
      const expirationDate = parse(product.expiration_date, 'yyyy-MM-dd', new Date());
      const notificationDate = addDays(expirationDate, -daysBefore);
      const daysLeft = differenceInDays(expirationDate, new Date());

      if (daysLeft > daysBefore) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Product Expiration Alert",
            body: `Your product ${product.product_name} will expire in ${daysBefore} days.`,
          },
          trigger: {
            date: notificationDate,
          },
        });
      }
    }
  };

  useEffect(() => {
    requests.listProducts().then((products) => {
      const nonWastedProducts = products.filter((product) => !product.wasted);
      const formattedProducts = nonWastedProducts.map(product => {
        let formattedExpirationDate = '';
        if (product.expiration_date) {
          try {
            const parsedDate = parse(product.expiration_date, 'MMM dd yyyy', new Date());

            if (isValid(parsedDate)) {
              formattedExpirationDate = format(parsedDate, 'yyyy-MM-dd');
            }
          } catch (error) {
            console.error('Error parsing expiration date:', product.expiration_date, error);
          }
        }

        // Schedule notifications for each product
        scheduleNotification(product);

        return {
          ...product,
          expiration_date: formattedExpirationDate ?? '',
        };
      });
      setProducts(formattedProducts);
    });
  }, [onProductAdded]);

  return (
    <View style={[GlobalStyles.container, GlobalStyles.background]}>
      <View style={GlobalStyles.header}>
        <View style={GlobalStyles.headerLeft}>
          <Text style={GlobalStyles.welcomeText}>Welcome {displayName}!</Text>
        </View>
        <IconButton
          icon="cog"
          size={24}
          iconColor={colors.icon}
          onPress={() => navigation.navigate({ name: 'Settings', params: {} })}
        />
      </View>
      <ProductList
        products={products}
        onDelete={handleDelete}
        onUpdateProduct={handleUpdateProduct}
        showWasteButton={true}
        onWaste={handleWaste}
      />
    </View>
  );
};

export default Homepage;
