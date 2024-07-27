import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests, { BASE_URL } from './Requests';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}


const AddProductModal: React.FC<AddProductModalProps> = ({ visible, onClose, onProductAdded }) => {
  const [productName, setProductName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const requests = new Requests()

  useEffect(() => {
    const loadLocationsAndCategories = async () => {
      const response = await requests.getLocationsAndCategories();
      setLocations(response.locations);
      setCategories(response.categories);
    };

    loadLocationsAndCategories();
  }, []);

  const handleExpirationDateChange = (date: string) => {
    setExpirationDate(date);
    setIsDatePickerVisible(false);
  };

  const handleExpirationDateFocus = () => {
    setIsDatePickerVisible(true);
  };

  const handleExpirationDateBlur = () => {
    setIsDatePickerVisible(false);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setLocationModalVisible(false);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCategoryModalVisible(false);
  };

  const handleAddProduct = async () => {
    const newProduct = {
      product_name: productName,
      expiration_date: expirationDate,
      location: location,
      category: category,
      barcode: '',
      product_id: '',
      wasted: false,
      creation_date: new Date().toISOString(),
    };

    const requests = new Requests();
    const success = await requests.addProduct(newProduct);
    if (success) {
      onProductAdded();
      onClose();
      setProductName('');
      setExpirationDate('');
      setLocation('');
      setCategory('');
    } else {
      console.error('Failed to add product');
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
            label="Expiration Date (MM/DD/YYYY)"
            value={expirationDate}
            onFocus={handleExpirationDateFocus}
            onBlur={handleExpirationDateBlur}
            onChangeText={text => setExpirationDate(text)}
          />
          <PaperTextInput style={GlobalStyles.input} mode="outlined" label="Barcode Number (optional)" />
          <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setLocationModalVisible(true)}>
            {location ? 'Location: ' + location : 'Select Location'}
          </Button>
          <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setCategoryModalVisible(true)}>
            {category ? 'Category: ' + category : 'Select Category'}
          </Button>
          <Button mode="contained" theme={{ colors: { primary: colors.primary } }} onPress={handleAddProduct}>
            Submit
          </Button>
          {isDatePickerVisible && <Calendar onDayPress={(day:any) => handleExpirationDateChange(day.dateString)} />}
          </View>
      </TouchableWithoutFeedback>

      <PaperModal visible={locationModalVisible} onDismiss={() => setLocationModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <View style={GlobalStyles.pickerContainer}>
          <Picker selectedValue={location} style={GlobalStyles.picker} onValueChange={handleLocationChange}>
            <Picker.Item label="Select Location" value="" />
            {locations.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </View>
      </PaperModal>

      <PaperModal visible={categoryModalVisible} onDismiss={() => setCategoryModalVisible(false)} contentContainerStyle={GlobalStyles.modalContent}>
        <Picker selectedValue={category} style={GlobalStyles.input} onValueChange={(itemValue) => handleCategoryChange(itemValue)}>
          <Picker.Item label="Select Category" value="" />
          {categories.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </PaperModal>
    </PaperModal>
  );
};

export default AddProductModal;
