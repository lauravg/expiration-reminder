import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Button, List, Modal as PaperModal, IconButton, Badge, TextInput as PaperTextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { parse, differenceInDays } from 'date-fns';
import GlobalStyles from './GlobalStyles';

import Requests from './Requests';
import { Product } from './Product';

const locationColors: { [key: string]: string } = {
  Pantry: '#c28ce1',
  Fridge: '#e1978c',
  'Freezer (Upstairs)': '#8ce1a0',
  'Freezer (Downstairs)': '#8cd5e1',
  'Liquor Cabinet': '#9d72b6',
};


const Homepage = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();

  const [productName, setProductName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000'); // Default color
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

  // Define a list of colors for the color picker
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#808080', '#800000'];

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

  // Function to render color options
  const renderColorOptions = () => {
    return colors.map((color) => (
      <TouchableWithoutFeedback key={color} onPress={() => handleColorSelect(color)}>
        <View style={[styles.colorOption, { backgroundColor: color }]} />
      </TouchableWithoutFeedback>
    ));
  };

  // Function to handle color selection
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setColorPickerVisible(false); // Optionally close the picker after selection
    alert(`Color selected: ${color}`); // TODO
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCategoryModalVisible(false);
  };


  const handleAddProduct = () => {
    // Handle adding the product
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


  const calculateTimeLeft = (expirationDate: string | null): string => {
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

  // Create a set of unique locations
  const uniqueLocations = Array.from(new Set(products.map(product => product.location)));
  const filterOptions = ['All', ...uniqueLocations];

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

        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="What are you searching for?"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
            {filterOptions.map((filter) => (
              <TouchableOpacity key={filter} onPress={() => setActiveFilter(filter)}>
                <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={GlobalStyles.productList}>
  <List.Section>
    {filteredProducts.map((product, index) => {
      return (
        <TouchableWithoutFeedback key={product.product_id} onPress={() => handleProductSelect(product)}>
          <View
            style={[
              GlobalStyles.productContainer,
              index !== filteredProducts.length - 1 && GlobalStyles.productContainer,
            ]}
          >
            <View style={GlobalStyles.productInfo}>
              <Text style={[GlobalStyles.productName]}>
                {product.product_name}
              </Text>
            </View>
            <View style={GlobalStyles.badgeContainer}>
            <Badge style={[GlobalStyles.badge, { backgroundColor: locationColors[product.location] || 'gray' }]}>{product.location}</Badge>
            <Text style={[GlobalStyles.timeLeft, { color: calculateTimeLeft(product.expiration_date) === 'Expired' ? 'red' : 'black' }]}>
                      {calculateTimeLeft(product.expiration_date)}
                    </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    })}
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
              <Text style={[GlobalStyles.detailValue, { color: calculateTimeLeft(selectedProduct.expiration_date) === 'Expired' ? 'red' : 'black' }]}>
                      {calculateTimeLeft(selectedProduct.expiration_date)}
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
          <View style={GlobalStyles.buttonContainer}>
            <Button style={GlobalStyles.button} onPress={() => selectedProduct && handleUpdate(selectedProduct)}>
              Update
            </Button>
            <Button style={GlobalStyles.button} onPress={() => handleDelete(selectedProduct)}>
              Delete
            </Button>
            <Button style={GlobalStyles.button} onPress={() => handleWaste(selectedProduct)}>
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
          <Button onPress={() => setColorPickerVisible(true)}>Select a Color</Button>
          {colorPickerVisible && (
            <PaperModal visible={colorPickerVisible} onDismiss={() => setColorPickerVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
              <View style={styles.colorPickerContainer}>{renderColorOptions()}</View>
            </PaperModal>
          )}
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
  searchInput: {
    marginVertical: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterText: {
    fontSize: 16,
    color: '#665a6f',
    marginHorizontal: 10,
  },
  activeFilterText: {
    fontSize: 16,
    color: '#663399',
    textDecorationLine: 'underline',
    marginHorizontal: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    margin: 5,
    borderRadius: 25,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'center',
  },
  productContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  productContainerWithBorder: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  daysLeftText: {
    marginTop: 5,
  },
});



export default Homepage;
