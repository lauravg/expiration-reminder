import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { IconButton, Menu, FAB } from 'react-native-paper';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { format, isValid, parse, addDays, differenceInDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';
import { SessionData } from './SessionData';
import { HouseholdManager } from './HouseholdManager';
import { StyleSheet } from 'react-native';

type SortOption = 'name' | 'expiration' | 'location' | 'category';

interface HomepageProps {
  onProductAdded: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onProductAdded }) => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [products, setProducts] = useState<Product[]>([]);
  const sessionData = new SessionData();
  const displayName = sessionData.userDisplayName;

  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'simple'>('grid');
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortAscending, setSortAscending] = useState(true);

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
            type: SchedulableTriggerInputTypes.DATE, // Use the imported enum or value
            date: notificationDate.getTime(), // Ensure the date is in milliseconds
          },
        });
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      householdManager.getActiveHouseholdId().then((hid) => {
        console.log('Active Household ID (Homepage):', hid); // Debug household ID
        requests.listProducts(hid).then((products) => {
          const nonWastedProducts = products.filter((product) => !product.wasted);
          // Schedule notifications for each product
          nonWastedProducts.forEach(product => {
            scheduleNotification(product);
          });
          setProducts(nonWastedProducts);
        }).catch((error) => {
          console.error('Error fetching products on Homepage:', error);
        });
      });
    }, [onProductAdded]) // Refresh when products are added
  );

  const getViewIcon = () => {
    switch (viewMode) {
      case 'grid':
        return 'view-grid-outline';
      case 'list':
        return 'view-list-outline';
      case 'simple':
        return 'format-list-text';
    }
  };
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSearchTerm(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchTerm('');
  };

  const getSortedProducts = (productsToSort: Product[]) => {
    return [...productsToSort].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case 'expiration':
          const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : Number.MAX_VALUE;
          const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : Number.MAX_VALUE;
          comparison = dateA - dateB;
          break;
        case 'location':
          const locA = a.location || '';
          const locB = b.location || '';
          comparison = locA.localeCompare(locB);
          break;
        case 'category':
          const catA = a.category || '';
          const catB = b.category || '';
          comparison = catA.localeCompare(catB);
          break;
      }
      return sortAscending ? comparison : -comparison;
    });
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(option);
      setSortAscending(true);
    }
    setSortMenuVisible(false);
  };

  const getSortIcon = () => {
    if (sortAscending) {
      return 'sort-ascending';
    }
    return 'sort-descending';
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={[GlobalStyles.header, styles.headerContainer]}>
        <View style={GlobalStyles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={GlobalStyles.headerTitle}>Your Pantry</Text>
            <Text style={styles.headerSubtitle}>Keep track of your food items</Text>
          </View>
          <View style={GlobalStyles.headerActions}>
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <IconButton 
                  icon={getSortIcon()}
                  iconColor={colors.textInverse}
                  size={24}
                  style={styles.sortButton}
                  onPress={() => setSortMenuVisible(true)}
                />
              }
            >
              <Menu.Item 
                onPress={() => handleSort('name')}
                title="Sort by Name"
                leadingIcon={sortBy === 'name' ? (sortAscending ? 'sort-alphabetical-ascending' : 'sort-alphabetical-descending') : 'sort-alphabetical-ascending'}
              />
              <Menu.Item 
                onPress={() => handleSort('expiration')}
                title="Sort by Expiration"
                leadingIcon={sortBy === 'expiration' ? (sortAscending ? 'calendar-arrow-up' : 'calendar-arrow-down') : 'calendar'}
              />
              <Menu.Item 
                onPress={() => handleSort('location')}
                title="Sort by Location"
                leadingIcon={sortBy === 'location' ? (sortAscending ? 'sort-ascending' : 'sort-descending') : 'map-marker'}
              />
              <Menu.Item 
                onPress={() => handleSort('category')}
                title="Sort by Category"
                leadingIcon={sortBy === 'category' ? (sortAscending ? 'sort-ascending' : 'sort-descending') : 'shape'}
              />
            </Menu>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton 
                  icon={getViewIcon()}
                  iconColor={colors.textInverse}
                  size={24}
                  style={GlobalStyles.viewToggle}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item 
                onPress={() => { 
                  setViewMode('grid');
                  setMenuVisible(false);
                }} 
                title="Grid View"
                leadingIcon="view-grid-outline"
              />
              <Menu.Item 
                onPress={() => {
                  setViewMode('list');
                  setMenuVisible(false);
                }} 
                title="List View"
                leadingIcon="view-list-outline"
              />
              <Menu.Item 
                onPress={() => {
                  setViewMode('simple');
                  setMenuVisible(false);
                }} 
                title="Simple List"
                leadingIcon="format-list-text"
              />
            </Menu>
            <IconButton
              icon="bell-outline"
              iconColor={colors.textInverse}
              size={24}
              onPress={() => {}}
            />
          </View>
        </View>
      </View>
      <View style={[GlobalStyles.searchContainer, styles.searchContainer]}>
        <View style={styles.searchInputContainer}>
          <IconButton
            icon="magnify"
            iconColor={colors.textSecondary}
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={styles.searchInput}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <IconButton
              icon="close"
              iconColor={colors.textSecondary}
              size={20}
              onPress={handleClearSearch}
              style={styles.clearIcon}
            />
          )}
        </View>
      </View>
      <ProductList
        products={getSortedProducts(products)}
        onDelete={handleDelete}
        onUpdateProduct={handleUpdateProduct}
        showWasteButton={true}
        onWaste={handleWaste}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        searchTerm={searchTerm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSubtitle: {
    color: colors.textInverse,
    opacity: 0.8,
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    marginTop: -30,
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchIcon: {
    margin: 0,
  },
  clearIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 8,
  },
  sortButton: {
    marginRight: 8,
  },
});

export default Homepage;
