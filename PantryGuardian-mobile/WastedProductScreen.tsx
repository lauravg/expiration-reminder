import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { List, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { parse, differenceInDays } from 'date-fns';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { Product } from './Product';

const WastedListScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const requests = new Requests();

  const handleProductSelect = (product: Product) => {
    console.log('Product selected:', product); // Log the entire product object
    setSelectedProduct(product);
  };

  const calculateDaysLeft = (expirationDate: string | null): string => {
    if (!expirationDate) {
      return '';
    }
    const parsedDate = parse(expirationDate, 'MMM dd yyyy', new Date());
    const today = new Date();
    const daysLeft = differenceInDays(parsedDate, today);

    if (daysLeft > 30) {
      const monthsLeft = Math.floor(daysLeft / 30);
      return `${monthsLeft} months`;
    } else if (daysLeft < 0) {
      return `Expired`;
    }

    return `${daysLeft} days`;
  };

  useEffect(() => {
    requests.listProducts().then((products) => {
      const wastedProducts = products.filter((product) => product.wasted);
      setProducts(wastedProducts);
    });
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || product.location === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const uniqueLocations = ['All', ...new Set(products.map(product => product.location))];

  return (
    <View style={GlobalStyles.containerWithHeader}>
      <ScrollView contentContainerStyle={GlobalStyles.scrollContainer}>
        <PaperTextInput
          mode="outlined"
          label="What are you searching for?"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={GlobalStyles.searchInput}
          theme={{ colors: { primary: colors.primary } }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={GlobalStyles.filterContainer}>
          {uniqueLocations.map((filter) => (
            <TouchableOpacity key={filter} onPress={() => setActiveFilter(filter)} style={GlobalStyles.filterButton}>
              <Text style={[GlobalStyles.filterText, activeFilter === filter && GlobalStyles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={GlobalStyles.productList}>
          <List.Section>
            {filteredProducts.map((product, index) => (
              <TouchableWithoutFeedback key={product.product_id} onPress={() => handleProductSelect(product)}>
                <View style={[GlobalStyles.productContainer, index === filteredProducts.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={GlobalStyles.productInfo}>
                    <Text style={GlobalStyles.productName}>
                      {product.product_name}
                    </Text>
                    <Text style={GlobalStyles.location}>
                      {product.location}
                    </Text>
                  </View>
                  <Text style={[GlobalStyles.expirationTextContainer, product.expiration_date && parse(product.expiration_date, 'MMM dd yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : { color: colors.onProductBackground }]}>
                    {calculateDaysLeft(product.expiration_date)}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            ))}
          </List.Section>
        </View>
      </ScrollView>

      {selectedProduct && (
        <PaperModal visible={true} onDismiss={() => setSelectedProduct(null)} contentContainerStyle={GlobalStyles.modalContent}>
          <Text style={GlobalStyles.modalTitle}>Product Details</Text>
          <View style={GlobalStyles.productDetails}>
            <View style={GlobalStyles.detailRow}>
              <Text style={GlobalStyles.detailLabel}>Product Name:</Text>
              <Text style={GlobalStyles.detailValue}>{selectedProduct.product_name}</Text>
            </View>
            <View style={GlobalStyles.detailRow}>
              <Text style={GlobalStyles.detailLabel}>Creation Date:</Text>
              <Text style={GlobalStyles.detailValue}>{selectedProduct.creation_date}</Text>
            </View>
            <View style={GlobalStyles.detailRow}>
              <Text style={GlobalStyles.detailLabel}>Expiration Date:</Text>
              <Text style={GlobalStyles.detailValue}>{selectedProduct.expiration_date}</Text>
            </View>
            <View style={GlobalStyles.detailRow}>
              <Text style={GlobalStyles.detailLabel}>Time until Expiration:</Text>
              <Text style={[GlobalStyles.expirationText, selectedProduct.expiration_date && parse(selectedProduct.expiration_date, 'MMM dd yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : { color: colors.onProductBackground }]}>
                {calculateDaysLeft(selectedProduct.expiration_date)}
              </Text>
            </View>
            <View style={GlobalStyles.detailRow}>
              <Text style={GlobalStyles.detailLabel}>Location:</Text>
              <Text style={GlobalStyles.detailValue}>{selectedProduct.location}</Text>
            </View>
            {selectedProduct.category && (
              <View style={GlobalStyles.detailRow}>
                <Text style={GlobalStyles.detailLabel}>Category:</Text>
                <Text style={GlobalStyles.detailValue}>{selectedProduct.category}</Text>
              </View>
            )}
          </View>
        </PaperModal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({});

export default WastedListScreen;
