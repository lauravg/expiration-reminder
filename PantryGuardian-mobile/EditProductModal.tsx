import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { isValid, format, parse } from 'date-fns';
import Requests from './Requests';

interface EditProductModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdateProduct: (product: Product) => Promise<void>;
  locations?: string[];  // Make locations optional since we're fetching them directly
}

const EditProductModal: React.FC<EditProductModalProps> = ({ visible, onClose, product, onUpdateProduct, locations }) => {
  const [productName, setProductName] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState<boolean>(false);
  const [locationModalVisible, setLocationModalVisible] = useState<boolean>(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [note, setNote] = useState<string>('');
  const requests = new Requests();

  // Fetch latest locations and categories when modal becomes visible
  useEffect(() => {
    if (visible) {
      const fetchLocationsAndCategories = async () => {
        try {
          const response = await requests.getLocationsAndCategories();
          setCategories(response.categories || []);
          setAvailableLocations(response.locations || []);
        } catch (error) {
          console.error("Error fetching locations and categories:", error);
        }
      };
      fetchLocationsAndCategories();
    }
  }, [visible]);

  useEffect(() => {
    if (product) {
      if (product.expiration_date && product.expiration_date !== 'No Expiration') {
        try {
          // Try parsing both formats
          let parsedDate;
          if (product.expiration_date.includes('-')) {
            // YYYY-MM-DD format
            parsedDate = parse(product.expiration_date, 'yyyy-MM-dd', new Date());
          } else {
            // MMM DD YYYY format
            parsedDate = parse(product.expiration_date, 'MMM dd yyyy', new Date());
          }
          
          if (isValid(parsedDate)) {
            // Always store in YYYY-MM-DD format internally
            const formattedDate = format(parsedDate, 'yyyy-MM-dd');
            setExpirationDate(formattedDate);
          } else {
            console.error('Invalid date format:', product.expiration_date);
            setExpirationDate('');
          }
        } catch (error) {
          console.error('Error parsing date:', error);
          setExpirationDate('');
        }
      } else {
        setExpirationDate('');
      }
      setProductName(product.product_name);
      setLocation(product.location || '');
      setCategory(product.category || '');
      setNote(product.note || '');
    }
  }, [product]);

  const handleExpirationDateChange = (date: string) => {
    setExpirationDate(date);
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

  const handleUpdateProduct = () => {
    if (product) {
      try {
        // Keep the date in YYYY-MM-DD format for the server
        const updatedProduct = {
          product_id: product.product_id,
          product_name: productName.trim(),
          expiration_date: expirationDate || '',  // Already in YYYY-MM-DD format
          location: location.trim() || '',
          category: category.trim() || '',
          note: note.trim() || '',
          wasted: false
        };

        console.log('Updating product with:', updatedProduct);
        onUpdateProduct(updatedProduct as Product);
        onClose();
      } catch (error) {
        console.error('Error updating product:', error);
      }
    }
  };

  const resetForm = () => {
    if (product) {
      setProductName(product.product_name);
      setExpirationDate(product.expiration_date || '');
      setLocation(product.location || '');
      setCategory(product.category || '');
      setNote(product.note || '');
    }
  };

  return (
    <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={GlobalStyles.modalContent}>
      <TouchableWithoutFeedback onPress={() => setIsDatePickerVisible(false)}>
        <View>
          <PaperTextInput
            style={GlobalStyles.input}
            mode="outlined"
            label="Product Name"
            value={productName}
            onChangeText={setProductName}
          />
          <PaperTextInput
            style={GlobalStyles.input}
            mode="outlined"
            label="Expiration Date (YYYY-MM-DD)"
            value={expirationDate}
            onFocus={() => setIsDatePickerVisible(true)}
            onChangeText={setExpirationDate}
          />
          {isDatePickerVisible && (
            <Calendar
              onDayPress={(day: any) => {
                handleExpirationDateChange(day.dateString);
                setIsDatePickerVisible(false);
              }}
              markedDates={{
                [expirationDate]: { selected: true, selectedColor: colors.primary }
              }}
            />
          )}
          <Button
            mode="text"
            onPress={() => setLocationModalVisible(true)}
            style={styles.selectButton}
            labelStyle={styles.selectButtonText}
          >
            {location ? `Location: ${location}` : 'Select Location'}
          </Button>
          <Button
            mode="text"
            onPress={() => setCategoryModalVisible(true)}
            style={styles.selectButton}
            labelStyle={styles.selectButtonText}
          >
            {category ? `Category: ${category}` : 'Select Category'}
          </Button>
          <PaperTextInput
            style={GlobalStyles.input}
            mode="outlined"
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={resetForm}
              style={styles.clearButton}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateProduct}
              style={styles.submitButton}
            >
              Update
            </Button>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <PaperModal
        visible={locationModalVisible}
        onDismiss={() => setLocationModalVisible(false)}
        contentContainerStyle={GlobalStyles.modalContent}
      >
        <Picker
          selectedValue={location}
          style={GlobalStyles.picker}
          onValueChange={(value) => {
            setLocation(value);
            setLocationModalVisible(false);
          }}
        >
          <Picker.Item label="Select Location" value="" />
          {availableLocations.map((loc) => (
            <Picker.Item key={loc} label={loc} value={loc} />
          ))}
        </Picker>
      </PaperModal>

      <PaperModal
        visible={categoryModalVisible}
        onDismiss={() => setCategoryModalVisible(false)}
        contentContainerStyle={GlobalStyles.modalContent}
      >
        <Picker
          selectedValue={category}
          style={GlobalStyles.picker}
          onValueChange={(value) => {
            setCategory(value);
            setCategoryModalVisible(false);
          }}
        >
          <Picker.Item label="Select Category" value="" />
          {categories.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </PaperModal>
    </PaperModal>
  );
};

const styles = StyleSheet.create({
  selectButton: {
    marginVertical: 8,
    justifyContent: 'center',
    height: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  selectButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 12,
  },
  clearButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
});

export default EditProductModal;
