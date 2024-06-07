import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Button, List, Modal as PaperModal, IconButton, TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { parse, differenceInDays, format } from 'date-fns';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { Product } from './Product';
import EditProductModal from './EditProductModal';

const Homepage = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [editProductModalVisible, setEditProductModalVisible] = useState(false);

  const requests = new Requests();

  const handleAddProductPress = () => {
    setAddProductModalVisible(true);
  };

  const handleAddProduct = () => {
    setAddProductModalVisible(false);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleDelete = async (product: Product) => {
    const success = await requests.deleteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
      setSelectedProduct(null);
    } else {
      console.error('Failed to delete product');
    }
  };

  const handleWaste = async (product: Product) => {
    const success = await requests.wasteProduct(product.product_id);
    if (success) {
      // Update the product list by marking the product as wasted
      const updatedProducts = products.map(p =>
        p.product_id === product.product_id ? { ...p, wasted: true } : p
      );
      // Filter out the wasted products
      const nonWastedProducts = updatedProducts.filter(p => !p.wasted);
      setProducts(nonWastedProducts);
      setSelectedProduct(null);
    } else {
      console.error('Failed to mark product as wasted');
    }
  };


  const handleUpdateProduct = async (updatedProduct: Product) => {
    const success = await requests.updateProduct(updatedProduct);
    if (success) {
      setProducts(products.map(p => p.product_id === updatedProduct.product_id ? updatedProduct : p));
      setEditProductModalVisible(false);
      setSelectedProduct(null); // Clear selected product after update
    } else {
      console.error('Failed to update product');
    }
  };

  const calculateDaysLeft = (expirationDate: string | null): string => {
    if (!expirationDate) {
      return '';
    }
    try {
      const parsedDate = parse(expirationDate, 'dd MMM yyyy', new Date());
      const today = new Date();
      const daysLeft = differenceInDays(parsedDate, today);

      if (isNaN(daysLeft) || daysLeft === null) {
        return '';
      }

      if (daysLeft > 30) {
        const monthsLeft = Math.floor(daysLeft / 30);
        return `${monthsLeft} months`;
      } else if (daysLeft < 0) {
        return `Expired`;
      }

      return `${daysLeft} days`;
    } catch (error) {
      console.error('Error parsing date:', error);
      return '';
    }
  };

  useEffect(() => {
    requests.listProducts().then((products) => {
      const nonWastedProducts = products.filter((product) => !product.wasted);
      // Ensure the date format is consistent
      const formattedProducts = nonWastedProducts.map(product => ({
        ...product,
        expiration_date: product.expiration_date ? format(new Date(product.expiration_date), 'dd MMM yyyy') : ''
      }));
      setProducts(formattedProducts);
    });
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || product.location === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const uniqueLocations = ['All', ...new Set(products.map(product => product.location))];

  return (
    <View style={GlobalStyles.container}>
      <ScrollView contentContainerStyle={GlobalStyles.scrollContainer}>
        <View style={GlobalStyles.header}>
          <View style={GlobalStyles.headerLeft}>
            <Text style={GlobalStyles.welcomeText}>Welcome Laura!</Text>
          </View>
          <IconButton
            icon="cog"
            size={24}
            iconColor={colors.icon}
            onPress={() => navigation.navigate({ name: 'Settings', params: {} })}
          />
        </View>

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
                  <Text style={[GlobalStyles.expirationTextContainer, product.expiration_date && parse(product.expiration_date, 'dd MMM yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : { color: colors.onProductBackground }]}>
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
              <Text style={[GlobalStyles.expirationText, selectedProduct.expiration_date && parse(selectedProduct.expiration_date, 'dd MMM yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : { color: colors.onProductBackground }]}>
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
          <View style={GlobalStyles.modalButton}>
            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => {
              setEditProductModalVisible(true);
              setSelectedProduct(selectedProduct);
            }}>
              Modify
            </Button>
            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => handleDelete(selectedProduct)}>
              Delete
            </Button>
            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => handleWaste(selectedProduct)}>
              Waste
            </Button>
          </View>
        </PaperModal>
      )}

      <EditProductModal
        visible={editProductModalVisible}
        onClose={() => setEditProductModalVisible(false)}
        product={selectedProduct}
        onUpdateProduct={handleUpdateProduct}
      />
    </View>
  );
};

export default Homepage;
