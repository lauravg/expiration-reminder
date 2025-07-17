import { format, isValid, parse } from 'date-fns';
import React, { useState } from 'react';
import { View, StyleSheet, Platform, TextInput, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';
import { colors } from './theme';
import { HouseholdManager } from './HouseholdManager';
import { useFocusEffect } from '@react-navigation/native';
import { getViewIcon } from './iconUtils';
import { useViewSettings } from './ViewSettings';

const UsedProductScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const {
    viewModeUsedList: viewMode,
    sortByUsedList: sortBy,
    activeFilterUsedList: activeFilter,
    hideExpiredUsedList: hideExpired,
    set: setViewSetting,
  } = useViewSettings();

  const setViewMode = (mode: 'list' | 'grid' | 'simple') => setViewSetting('viewModeUsedList', mode);
  const setSortBy = (sort: string) => setViewSetting('sortByUsedList', sort);
  const setActiveFilter = (filter: string) => setViewSetting('activeFilterUsedList', filter);
  const setHideExpired = (hide: boolean) => setViewSetting('hideExpiredUsedList', hide);

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
    // Implementation of handleWaste function for used products
  };

  const handleUse = async (product: Product) => {
    // Used products are already used, so this function is not applicable
    console.log('Product is already used:', product.product_name);
  };

  const handleSort = (option: string) => {
    setSortBy(option);
    setSortMenuVisible(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSearchTerm(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchTerm('');
  };

  useFocusEffect(
    React.useCallback(() => {
      householdManager.getActiveHouseholdId().then((hid) => {
        if (!hid) {
          console.error('No household ID found.');
          return;
        }
        console.log('Active Household ID (UsedProductScreen):', hid);
        requests.listProducts(hid).then((products) => {
          const usedProducts = products.filter((product) => product.used);
          setProducts(usedProducts);
        }).catch((error) => {
          console.error('Error fetching products on UsedProductScreen:', error);
        });
      });
    }, [])
  );

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
                placeholder="Search used products..."
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
        </View>
      </View>

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
        showUseButton={false}
        onWaste={handleWaste}
        onUse={handleUse}
        getViewIcon={getViewIcon}
        sortBy={sortBy}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        hideExpired={hideExpired}
        setHideExpired={setHideExpired}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 75 : 55,
    paddingBottom: 0,
  },
  headerContent: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.surface,
    marginBottom: 10,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
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
  deleteButton: {
    backgroundColor: colors.error,
  },
});

export default UsedProductScreen; 