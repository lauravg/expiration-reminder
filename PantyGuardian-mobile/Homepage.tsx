import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Button, List, Modal as PaperModal, IconButton, Badge, TextInput as PaperTextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';

interface Product {
  product_name: string;
  creation_date: string;
  expiration_date: string;
  location: string;
  category?: string;
  product_id: number;
  expired: boolean;
  wasted: boolean;
  wasted_date?: string;
  
}

const HomePage = () => {
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

  const handleAddProductPress = () => {
    console.log('Opening add product modal...');
    setAddProductModalVisible(true);
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
    console.log("Product selected:", product);  // Log the entire product object
    setSelectedProduct(product);
    setwasteModalVisible(false);  // Assuming this is now correctly not related to the waste status for testing
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


  const products: Product[] = [
    { product_name: 'Product 1', expiration_date: '2024-05-01', location: 'Fridge', product_id: 1, expired: false, creation_date: '2024-04-20', wasted: false },
    { product_name: 'Product 2', expiration_date: '2024-05-11', location: 'Pantry', product_id: 2, expired: true, creation_date: '2024-04-21', wasted: false },
    { product_name: 'Product 3', expiration_date: '2024-05-21', location: 'Fridge', product_id: 3, expired: true, creation_date: '2024-04-22', wasted: false },
    { product_name: 'Product 4', expiration_date: '2024-06-10', location: 'Pantry', product_id: 4, expired: true, creation_date: '2024-04-23', wasted: false },
    { product_name: 'Product 5', expiration_date: '2024-07-10', location: 'Pantry', product_id: 5, expired: true, creation_date: '2024-04-24', wasted: true, wasted_date: '2024-04-25' },
    { product_name: 'Product 6', expiration_date: '2024-05-11', location: 'Pantry', product_id: 6, expired: true, creation_date: '2024-04-21', wasted: true, wasted_date: '2024-04-26' },
  ];

  const nonWastedProducts = products.filter(product => !product.wasted);

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
            style={GlobalStyles.settingsIcon}
          />
        </View>

        <Button mode="contained" style={GlobalStyles.addButton} onPress={handleAddProductPress}>Add Product</Button>

        <View style={GlobalStyles.links}>
          <Button onPress={() => navigation.navigate({ name: 'WastedProductList', params: { someParam: 'value' } })}>Wasted Products</Button>
          <Button onPress={() => { }} style={GlobalStyles.linkButton}>Generate Recipe</Button>
        </View>



        <View style={GlobalStyles.productList}>
          <Text style={GlobalStyles.sectionHeader}>Product List</Text>
          <List.Section>
            {nonWastedProducts.map(product => (
              <TouchableWithoutFeedback key={product.product_id} onPress={() => handleProductSelect(product)}>
                <View style={GlobalStyles.productContainer}>
                  <List.Item
                    title={product.product_name}
                    description={`Expiration Date: ${product.expiration_date}`}
                  />
                  <View style={GlobalStyles.badgeContainer}>
                    <Badge style={GlobalStyles.badge}>{product.location}</Badge>
                  </View>
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
            <Button style={GlobalStyles.button} onPress={() => selectedProduct && handleUpdate(selectedProduct)}>Update</Button>
            <Button style={GlobalStyles.button} onPress={() => handleDelete(selectedProduct)}>Delete</Button>
            <Button style={GlobalStyles.button} onPress={() => handleWaste(selectedProduct)}>Waste</Button>
          </View>

        </PaperModal>
      )}
      <PaperModal visible={addProductModalVisible} onDismiss={() => setAddProductModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <TouchableWithoutFeedback onPress={() => setIsDatePickerVisible(false)}>
          <View>
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Enter the product name"
              value={productName}
              onChangeText={text => setProductName(text)}
            />
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Expiration Date (MM/DD/YYYY)"
              value={expirationDate}
              onFocus={handleExpirationDateFocus}
              onBlur={handleExpirationDateBlur}
              onChangeText={text => setExpirationDate(text)}
            />
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Barcode Number (optional)"
            />
            <Button style={GlobalStyles.button} onPress={handleLocationPress}>{location ? 'Location: ' + location : 'Select Location'}</Button>
            <Button style={GlobalStyles.button} onPress={handleCategoryPress}>{category ? 'Category: ' + category : 'Select Category'}</Button>
            <Button mode="contained" style={GlobalStyles.button} onPress={handleAddProduct}>Submit</Button>
            {isDatePickerVisible && (
              <Calendar
                onDayPress={(day) => handleExpirationDateChange(day.dateString)}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </PaperModal>

      <PaperModal visible={locationModalVisible} onDismiss={() => setLocationModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <View style={GlobalStyles.pickerContainer}>
          <Picker
            selectedValue={location}
            style={GlobalStyles.picker}
            onValueChange={handleLocationChange}>
            <Picker.Item label="Select Location" value="" />
            <Picker.Item label="Pantry" value="Pantry" />
            <Picker.Item label="Fridge" value="Fridge" />
            <Picker.Item label="Freezer (Kitchen)" value="Freezer (Kitchen)" />
            <Picker.Item label="Freezer (Downstairs)" value="Freezer (Downstairs)" />
            <Picker.Item label="Liquor Cabinet" value="Liquor Cabinet" />
          </Picker>
          <Button onPress={() => setColorPickerVisible(true)}>Select a Color</Button>
      {colorPickerVisible && (
        <PaperModal
          visible={colorPickerVisible}
          onDismiss={() => setColorPickerVisible(false)}
          contentContainerStyle={GlobalStyles.modalContent}
        >
          <View style={styles.colorPickerContainer}>
            {renderColorOptions()}
          </View>
        </PaperModal>
      )}
        </View>
      </PaperModal>

      <PaperModal visible={categoryModalVisible} onDismiss={() => setCategoryModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <Picker
          selectedValue={category}
          style={GlobalStyles.input}
          onValueChange={(itemValue) => handleCategoryChange(itemValue)}>
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
  }

});

export default HomePage;
