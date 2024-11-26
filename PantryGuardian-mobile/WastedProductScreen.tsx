import { format, isValid, parse } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';
import { colors } from './theme';
import { HouseholdManager } from './HouseholdManager';
import { useFocusEffect } from '@react-navigation/native';

const WastedProductScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);

  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const handleDelete = async (product: Product) => {
    const success = await requests.deleteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
    } else {
      console.error('Failed to delete product');
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

  useFocusEffect(
    React.useCallback(() => {
      householdManager.getActiveHouseholdId().then((hid) => {
        if (!hid) {
          console.error('No household ID found.');
          return;
        }
        console.log('Active Household ID (WastedProductScreen):', hid); // Debug household ID
        requests.listProducts(hid).then((products) => {
          const wastedProducts = products.filter((product) => product.wasted);
          const formattedProducts = wastedProducts.map(product => {
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
            return {
              ...product,
              expiration_date: formattedExpirationDate ?? '',
            };
          });
          setProducts(formattedProducts);
        }).catch((error) => {
          console.error('Error fetching products on WastedProductScreen:', error);
        });
      });
    }, [])
  );

  useEffect(() => {
    const updateWastedProducts = async () => {
      try {
        const householdId = await householdManager.getActiveHouseholdId();
        if (!householdId) {
          console.error('No household ID found.');
          return;
        }

        const products = await requests.listProducts(householdId);
        const wastedProducts = products.filter(product => product.wasted);
        setProducts(wastedProducts);
      } catch (error) {
        console.error('Error updating wasted products:', error);
      }
    };

    const interval = setInterval(updateWastedProducts, 5000);
    return () => clearInterval(interval);
  }, []);


  return (
    <View style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <ProductList
        products={products}
        onDelete={handleDelete}
        onUpdateProduct={handleUpdateProduct}
      />
    </View>
  );
};

export default WastedProductScreen;
