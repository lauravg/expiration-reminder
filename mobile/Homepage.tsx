import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { IconButton, FAB } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { isValid, parse, addDays, differenceInDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';
import { HouseholdManager } from './HouseholdManager';
import { StyleSheet } from 'react-native';
import ExpiringProductsModal from './ExpiringProductsModal';
import ShoppingListModal from './ShoppingListModal';
import { useViewSettings } from './ViewSettings';

type SortOption = 'name' | 'expiration' | 'location' | 'category';

interface HomepageProps {
  onAddProduct: (product: Product) => Promise<boolean>;
  selectedProduct: Product | null;
  onProductSelect: (product: Product | null) => void;
}

const Homepage: React.FC<HomepageProps> = ({
  onAddProduct,
  selectedProduct: externalSelectedProduct,
  onProductSelect: externalOnProductSelect,
}) => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const {
    viewModeProductList: viewMode,
    sortByProductList: sortBy,
    activeFilterProductList: activeFilter,
    hideExpiredProductList: hideExpired,
    set: setViewSetting,
  } = useViewSettings();

  const [menuVisible, setMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [isExpiringModalVisible, setIsExpiringModalVisible] = useState(false);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  
  const setActiveFilter = (filter: string) => setViewSetting('activeFilterProductList', filter);
  const setHideExpired = (hide: boolean) => setViewSetting('hideExpiredProductList', hide);
  const setViewMode = (mode: 'list' | 'grid' | 'simple') => setViewSetting('viewModeProductList', mode);

  const handleDelete = async (product: Product) => {
    const success = await requests.deleteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
      // Show shopping list modal
      showShoppingListModal(product);
    } else {
      console.error('Failed to delete product');
    }
  };

  const handleWaste = async (product: Product) => {
    const success = await requests.wasteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
      // Show shopping list modal
      showShoppingListModal(product);
    } else {
      console.error('Failed to mark product as wasted');
    }
  };

  const handleUse = async (product: Product) => {
    const success = await requests.useProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
      // Show shopping list modal
      showShoppingListModal(product);
    } else {
      console.error('Failed to mark product as used');
    }
  };

  const [shoppingListModalVisible, setShoppingListModalVisible] = useState(false);
  const [productForShoppingList, setProductForShoppingList] = useState<Product | null>(null);

  const showShoppingListModal = (product: Product) => {
    setProductForShoppingList(product);
    setShoppingListModalVisible(true);
  };

  const handleAddToShoppingList = async (productName: string, note?: string, quantity?: number) => {
    const hid = await householdManager.getActiveHouseholdId();
    if (hid) {
      const success = await requests.addToShoppingList(productName, hid, note, quantity);
      if (success) {
        console.log('Product added to shopping list successfully');
      } else {
        console.error('Failed to add product to shopping list');
      }
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
          const activeProducts = products.filter((product) => !product.wasted && !product.used);
          // Schedule notifications for each product
          activeProducts.forEach(product => {
            scheduleNotification(product);
          });
          setProducts(activeProducts);
        }).catch((error) => {
          console.error('Error fetching products on Homepage:', error);
        });
      });
    }, [onAddProduct]) // Refresh when products are added
  );

  const getViewIcon = (): 'view-grid-outline' | 'view-list-outline' | 'format-list-text' => {
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
    // First filter by search query
    const filteredProducts = productsToSort.filter(product => {
      const searchLower = searchQuery.toLowerCase();
      return (
        product.product_name.toLowerCase().includes(searchLower) ||
        (product.location || '').toLowerCase().includes(searchLower) ||
        (product.category || '').toLowerCase().includes(searchLower) ||
        (product.note || '').toLowerCase().includes(searchLower)
      );
    });

    // Then sort the filtered results
    return [...filteredProducts].sort((a, b) => {
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
      setViewSetting('sortByProductList', option);
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

  const getExpiringCount = () => {
    return products.filter(product => {
      const daysLeft = calculateDaysLeft(product.expiration_date ?? '');
      return !isNaN(parseInt(daysLeft)) && parseInt(daysLeft) <= 7;
    }).length;
  };

  const calculateDaysLeft = (expirationDate: string): string => {
    if (!expirationDate) return 'No date';
    try {
      const expDate = parse(expirationDate, 'yyyy-MM-dd', new Date());
      if (!isValid(expDate)) {
        console.log(`Invalid date format for: ${expirationDate}`);
        return 'Invalid date';
      }
      const days = differenceInDays(expDate, new Date());
      console.log(`Days left for ${expirationDate}: ${days}`);
      if (days < 0) return 'Expired';
      return days.toString();
    } catch (error) {
      console.error(`Error parsing date: ${expirationDate}`, error);
      return 'Invalid date';
    }
  };

  const handleBellPress = async () => {
    console.log('Bell pressed - checking expiring products...');
    const daysBefore = parseInt(await AsyncStorage.getItem('daysBefore') || '5', 10);
    console.log('Days before threshold:', daysBefore);
    
    const filtered = products.filter(product => {
      if (!product.expiration_date || product.expiration_date === 'No Expiration') {
        console.log(`Skipping product ${product.product_name}: No expiration date`);
        return false;
      }
      try {
        const expDate = parse(product.expiration_date, 'LLL dd yyyy', new Date());
        if (!isValid(expDate)) {
          console.log(`Invalid date format for: ${product.expiration_date}`);
          return false;
        }
        const daysLeft = differenceInDays(expDate, new Date());
        console.log(`Product ${product.product_name}: ${daysLeft} days left`);
        
        // Include products that:
        // 1. Have not expired (daysLeft >= 0)
        // 2. Will expire within the notification threshold
        const shouldInclude = daysLeft >= 0 && daysLeft <= daysBefore;
        console.log(`Including ${product.product_name}? ${shouldInclude} (expires in ${daysLeft} days, threshold: ${daysBefore} days)`);
        return shouldInclude;
      } catch (error) {
        console.error(`Error processing date for ${product.product_name}:`, error);
        return false;
      }
    });
    
    console.log('Found expiring products:', filtered.length);
    console.log('Expiring products:', filtered);
    
    // Force state update by creating a new array
    setExpiringProducts([...filtered]);
    setIsExpiringModalVisible(true);
  };

  const handleProductPress = (product: Product) => {
    externalOnProductSelect(product);
    setIsExpiringModalVisible(false);
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={[GlobalStyles.header, styles.headerContainer]}>
        <View style={styles.headerContent}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <IconButton
                icon="magnify"
                iconColor={colors.textSecondary}
                size={24}
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
            <IconButton
              icon="bell-outline"
              iconColor={colors.textInverse}
              size={24}
              style={styles.actionButton}
              onPress={handleBellPress}
            />
          </View>
        </View>
      </View>

      <ProductList
        products={getSortedProducts(products)}
        onDelete={handleDelete}
        onUpdateProduct={handleUpdateProduct}
        showWasteButton={true}
        showUseButton={true}
        onWaste={handleWaste}
        onUse={handleUse}
        searchQuery={searchQuery}
        searchTerm={searchTerm}
        onSort={(option: string) => handleSort(option as SortOption)}
        sortMenuVisible={sortMenuVisible}
        setSortMenuVisible={setSortMenuVisible}
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
        getViewIcon={getViewIcon}
        selectedProduct={externalSelectedProduct}
        onProductSelect={externalOnProductSelect}
        sortBy={sortBy}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        hideExpired={hideExpired}
        setHideExpired={setHideExpired}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <ExpiringProductsModal
        visible={isExpiringModalVisible}
        onClose={() => {
          console.log('Closing expiring products modal');
          setIsExpiringModalVisible(false);
        }}
        products={expiringProducts}
        onProductPress={handleProductPress}
        onDelete={handleDelete}
        onWaste={handleWaste}
        onUpdateProduct={handleUpdateProduct}
      />

      <ShoppingListModal
        visible={shoppingListModalVisible}
        onClose={() => {
          setShoppingListModalVisible(false);
          setProductForShoppingList(null);
        }}
        onConfirm={handleAddToShoppingList}
        productName={productForShoppingList?.product_name || ''}
      />

      {/* Product details modal is handled by ProductList component */}
      
      {/* Remove the FAB for the cart */}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 0,
  },
  headerContent: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearIcon: {
    margin: 0,
  },
  actionButton: {
    margin: 0,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
    padding: 16,
  },
  button: {
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  wasteButton: {
    backgroundColor: colors.warning,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
    backgroundColor: colors.primary,
  },
});

export default Homepage;
