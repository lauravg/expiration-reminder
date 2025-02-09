import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';

import { Product } from './Product';
import { isValid, format, parse } from 'date-fns';
import Requests, { BASE_URL } from './Requests';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdateProduct: (product: Product) => Promise<void>;
  locations: string[]; // Must be strictly string[]
}

const EditProductModal: React.FC<EditProductModalProps> = ({ visible, onClose, product, onUpdateProduct }) => {
  const [productName, setProductName] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState<boolean>(false);
  const [locationModalVisible, setLocationModalVisible] = useState<boolean>(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [note, setNote] = useState<string>('');
  const requests = new Requests()

  useEffect(() => {
    const loadLocationsAndCategories = async () => {
      try {
        const response = await requests.getLocationsAndCategories();
        console.log("Locations fetched:", response.locations);
        console.log("Categories fetched:", response.categories);
        setLocations(response.locations || []); // Ensure the state is updated with fetched locations
        setCategories(response.categories || []); // Ensure the state is updated with fetched categories
      } catch (error) {
        console.error("Error fetching locations and categories:", error);
      }
    };

    loadLocationsAndCategories();
  }, []);

  useEffect(() => {
    if (product) {
      // Reformat the date for the date picker expected format.
      if (product.expiration_date) {
        const parsedDate = parse(product.expiration_date, 'MMM dd yyyy', new Date());
        if (isValid(parsedDate)) {
          let formattedExpirationDate = format(parsedDate, 'yyyy-MM-dd');
          setExpirationDate(formattedExpirationDate)
        }
      }

      setProductName(product.product_name);
      setLocation(product.location || '');
      setCategory(product.category || '');
      setNote(product.note || '');
    }
  }, [product]);

  // Add the following here:
  useEffect(() => {
    console.log("Received locations in EditProductModal:", locations);
  }, [locations]);


  const handleExpirationDateChange = (date: string) => {
    setExpirationDate(date);
    setIsDatePickerVisible(false);
  };

  const handleExpirationDateFocus = () => {
    setIsDatePickerVisible(true);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setLocationModalVisible(false);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCategoryModalVisible(false);
  };

  const handleUpdateProduct = () => {
    if (product) {
      const updatedProduct: Product = {
        ...product,
        product_name: productName,
        expiration_date: expirationDate,
        location: location,
        category: category,
        note: note,
      };
      onUpdateProduct(updatedProduct);
      onClose();
    }
  };

  return (
    <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={GlobalStyles.modalContent}>
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
            label="Expiration Date (YYYY-MM-DD)"
            value={expirationDate}
            onFocus={handleExpirationDateFocus}
            onChangeText={text => setExpirationDate(text)}
          />
          <PaperTextInput style={GlobalStyles.input} mode="outlined" label="Barcode Number (optional)" />
          <View style={GlobalStyles.buttonContainer}>
            <Button
              mode="outlined"
              style={GlobalStyles.actionButton}
              labelStyle={GlobalStyles.actionButtonText}
              onPress={() => setLocationModalVisible(true)}
            >
              {location ? `Location: ${location}` : 'Select Location'}
            </Button>
            <Button
              mode="outlined"
              style={GlobalStyles.actionButton}
              labelStyle={GlobalStyles.actionButtonText}
              onPress={() => setCategoryModalVisible(true)}
            >
              {category ? `Category: ${category}` : 'Select Category'}
            </Button>
          </View>
          <Button
            mode="contained"
            style={[GlobalStyles.button, { marginTop: 16 }]}
            onPress={handleUpdateProduct}
          >
            Update
          </Button>
          {isDatePickerVisible && <Calendar onDayPress={(day: any) => handleExpirationDateChange(day.dateString)} />}
        </View>
      </TouchableWithoutFeedback>

      <PaperModal
        visible={locationModalVisible}
        onDismiss={() => setLocationModalVisible(false)}
        contentContainerStyle={GlobalStyles.modalContent}
      >
        <View style={GlobalStyles.pickerContainer}>
          <Picker
            selectedValue={location}
            style={GlobalStyles.picker}
            onValueChange={(itemValue) => setLocation(itemValue)}
          >
            <Picker.Item label="Select Location" value="" />
            {locations.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </View>
      </PaperModal>

      <PaperModal
        visible={categoryModalVisible}
        onDismiss={() => setCategoryModalVisible(false)}
        contentContainerStyle={GlobalStyles.modalContent}
      >
        <View style={GlobalStyles.pickerContainer}>
          <Picker
            selectedValue={category}
            style={GlobalStyles.picker}
            onValueChange={(itemValue) => handleCategoryChange(itemValue)}
          >
            <Picker.Item label="Select Category" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </PaperModal>
      <PaperTextInput
        style={GlobalStyles.input}
        mode="outlined"
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
      />
    </PaperModal>
  );
};

export default EditProductModal;
