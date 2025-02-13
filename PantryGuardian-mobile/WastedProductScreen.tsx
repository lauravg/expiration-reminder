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
import { getViewIcon } from './iconUtils';

const WastedProductScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'simple'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  // Load view settings on mount
  useEffect(() => {
    const loadViewSettings = async () => {
      try {
        const settings = await requests.getViewSettings();
        if (settings) {
          setViewMode(settings.viewMode as 'list' | 'grid' | 'simple');
          setSortBy(settings.sortBy);
        }
      } catch (error) {
        console.error('Error loading view settings:', error);
      }
    };
    loadViewSettings();
  }, []);

  // Save view settings whenever they change
  useEffect(() => {
    const saveViewSettings = async () => {
      try {
        await requests.saveViewSettings({
          viewMode,
          sortBy,
          hideExpired: false,
          activeFilter: 'All'
        });
      } catch (error) {
        console.error('Error saving view settings:', error);
      }
    };
    saveViewSettings();
  }, [viewMode, sortBy]);


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

  const handleWaste = async (product: Product) => {
    // Implementation of handleWaste function
  };

  const handleSort = (option: string) => {
    setSortBy(option);
    setSortMenuVisible(false);
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
          // No need to format dates here since they're already in the correct format from backend
          setProducts(wastedProducts);
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        searchTerm={searchTerm}
        onSort={handleSort}
        sortMenuVisible={sortMenuVisible}
        setSortMenuVisible={setSortMenuVisible}
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
        showWasteButton={false}
        onWaste={handleWaste}
        getViewIcon={getViewIcon}
        sortBy={sortBy}
      />
    </View>
  );
};

export default WastedProductScreen;
