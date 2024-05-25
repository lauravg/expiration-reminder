import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Button, List, Modal as PaperModal, IconButton, Badge, TextInput as PaperTextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { parse, differenceInDays } from 'date-fns';
import GlobalStyles from './GlobalStyles';
import {colors} from './theme';

import Requests from './Requests';
import { Product } from './Product';

const Homepage = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();

  const [productName, setProductName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [wasteModalVisible, setwasteModalVisible] = useState(false);
  const [wastedDate, setWastedDate] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const requests = new Requests();

  const handleLocationPress = () => {
    setLocationModalVisible(true);
  };

  const handleCategoryPress = () => {
    setCategoryModalVisible(true);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setLocationModalVisible(false);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCategoryModalVisible(false);
  };

  const handleAddProductPress = () => {
    console.log('Opening add product modal...');
    setAddProductModalVisible(true);
  };

  const handleAddProduct = () => {
    setAddProductModalVisible(false);
  };

  const handleExpirationDateChange = (date: string) => {
    setExpirationDate(date);
    setIsDatePickerVisible(false); // Close date picker when a date is selected
  };

  const handleExpirationDateFocus = () => {
    setIsDatePickerVisible(true);
  };

  const handleExpirationDateBlur = () => {
    setIsDatePickerVisible(false);
  };

  const handleProductSelect = (product: Product) => {
    console.log('Product selected:', product); // Log the entire product object
    setSelectedProduct(product);
    setwasteModalVisible(false); // Assuming this is now correctly not related to the waste status for testing
  };

  const handleUpdate = (product: Product) => {
    // Handle update action
  };

  const handleDelete = (product: Product) => {
    // Handle delete action
  };

  const handleWaste = (product: Product) => {
    // Handle waste action
  };

  const calculateDaysLeft = (expirationDate: string | null): string => {
    if (!expirationDate) {
      return 'Invalid date';
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
      const nonWastedProducts = products.filter((product) => !product.wasted);
      setProducts(nonWastedProducts);
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
            onPress={() => navigation.navigate({ name: 'Settings', params: { /* your parameters */ } })}
          />
        </View>
        {/* <View style={GlobalStyles.link}>
          <Button onPress={() => navigation.navigate({ name: 'WastedProductList', params: { someParam: 'value' } })} theme={{ colors: {primary: colors.primary} }} style={GlobalStyles.link}>Wasted Products</Button>
          <Button onPress={() => { }} theme={{ colors: {primary: colors.primary} }} style={GlobalStyles.link}>Generate Recipe</Button>
        </View> */}

        <PaperTextInput
          mode="outlined"
          label="What are you searching for?"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={GlobalStyles.searchInput}
          theme={{ colors: {primary: colors.primary} }}
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
                  <Text style={[GlobalStyles.expirationTextContainer, product.expiration_date && parse(product.expiration_date, 'MMM dd yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : {color: colors.onProductBackground}]}>
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
              <Text style={[GlobalStyles.expirationText, selectedProduct.expiration_date && parse(selectedProduct.expiration_date, 'MMM dd yyyy', new Date()) < new Date() ? GlobalStyles.expirationText : {color: colors.onProductBackground}]}>
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
            <Button theme={{ colors: {primary: colors.primary} }} onPress={() => selectedProduct && handleUpdate(selectedProduct)}>
              Modify
            </Button>
            <Button theme={{ colors: {primary: colors.primary} }} onPress={() => handleDelete(selectedProduct)}>
              Delete
            </Button>
            <Button theme={{ colors: {primary: colors.primary} }} onPress={() => handleWaste(selectedProduct)}>
              Waste
            </Button>
          </View>
        </PaperModal>
      )}

      <PaperModal visible={locationModalVisible} onDismiss={() => setLocationModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <View style={GlobalStyles.pickerContainer}>
          <Picker selectedValue={location} style={GlobalStyles.picker} onValueChange={handleLocationChange}>
            <Picker.Item label="Select Location" value="" />
            <Picker.Item label="Pantry" value="Pantry" />
            <Picker.Item label="Fridge" value="Fridge" />
            <Picker.Item label="Freezer (Kitchen)" value="Freezer (Kitchen)" />
            <Picker.Item label="Freezer (Downstairs)" value="Freezer (Downstairs)" />
            <Picker.Item label="Liquor Cabinet" value="Liquor Cabinet" />
          </Picker>
        </View>
      </PaperModal>

      <PaperModal visible={categoryModalVisible} onDismiss={() => setCategoryModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <Picker selectedValue={category} style={GlobalStyles.input} onValueChange={(itemValue) => handleCategoryChange(itemValue)}>
          <Picker.Item label="Select Category" value="" />
          <Picker.Item label="Food" value="Food" />
          <Picker.Item label="Baby Food" value="Baby Food" />
          <Picker.Item label="Veggies" value="Veggies" />
          <Picker.Item label="Meat" value="Meat" />
          <Picker.Item label="Fish" value="Fish" />
          <Picker.Item label="Fruits" value="Fruits" />
          <Picker.Item label="Sauce/Dressing" value="Sauce" />
          <Picker.Item label="Spices" value="Spices" />
          <Picker.Item label="Juice/Beverages" value="Juice/Beverages" />
          <Picker.Item label="Liquor" value="Liquor" />
          <Picker.Item label="Wine" value="Wine" />
          <Picker.Item label="Beer" value="Beer" />
          <Picker.Item label="Whisky" value="Whisky" />
          <Picker.Item label="Sparkling" value="Bubbly" />
          <Picker.Item label="Others" value="Others" />
        </Picker>
      </PaperModal>
    </View>
  );
};

const styles = StyleSheet.create({

});

export default Homepage;
