import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { format, parse } from 'date-fns';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdateProduct: (product: Product) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ visible, onClose, product, onUpdateProduct }) => {
  const [productName, setProductName] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState<boolean>(false);
  const [locationModalVisible, setLocationModalVisible] = useState<boolean>(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setProductName(product.product_name);
      setExpirationDate(product.expiration_date || '');
      setLocation(product.location || '');
      setCategory(product.category || '');
    }
  }, [product]);

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
      // Format the date to match the expected format "%d %b %Y"
      const formattedExpirationDate = expirationDate ? format(parse(expirationDate, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy') : '';

      const updatedProduct: Product = {
        ...product,
        product_name: productName,
        expiration_date: formattedExpirationDate,
        location: location,
        category: category,
      };
      onUpdateProduct(updatedProduct);
      onClose();
    } else {
      console.error('No product to update');
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
          <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setLocationModalVisible(true)}>
            {location ? 'Location: ' + location : 'Select Location'}
          </Button>
          <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setCategoryModalVisible(true)}>
            {category ? 'Category: ' + category : 'Select Category'}
          </Button>
          <Button mode="contained" theme={{ colors: { primary: colors.primary } }} onPress={handleUpdateProduct}>
            Submit
          </Button>
          {isDatePickerVisible && <Calendar onDayPress={(day) => handleExpirationDateChange(day.dateString)} />}
        </View>
      </TouchableWithoutFeedback>

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
    </PaperModal>
  );
};

export default EditProductModal;
