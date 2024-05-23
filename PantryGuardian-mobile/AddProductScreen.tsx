import React, { useState } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import GlobalStyles from './GlobalStyles';

interface AddProductScreenProps {
  visible: boolean;
  onClose: () => void;
}

const AddProductScreen: React.FC<AddProductScreenProps> = ({ visible, onClose }) => {
  const [productName, setProductName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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

  const handleAddProduct = () => {
    // Handle adding the product
    onClose();
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
          <Button style={GlobalStyles.button} onPress={() => setLocation('')}>
            {location ? 'Location: ' + location : 'Select Location'}
          </Button>
          <Button style={GlobalStyles.button} onPress={() => setCategory('')}>
            {category ? 'Category: ' + category : 'Select Category'}
          </Button>
          <Button mode="contained" style={GlobalStyles.button} onPress={handleAddProduct}>
            Submit
          </Button>
          {isDatePickerVisible && <Calendar onDayPress={(day) => handleExpirationDateChange(day.dateString)} />}
        </View>
      </TouchableWithoutFeedback>
    </PaperModal>
  );
};

export default AddProductScreen;
