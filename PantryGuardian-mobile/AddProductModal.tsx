import React, { useState, useEffect } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';
import Requests from './Requests';
import moment from 'moment';
import { Product, Barcode } from './Product';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => Promise<boolean>;
  onAddBarcode: (barcode: string, name: string) => Promise<boolean>;
  onGetBarcode: (barcode: string) => Promise<Barcode | null>;
}

interface ProductSuggestion {
  name: string;
  barcode: string;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ visible, onClose, onAddProduct, onAddBarcode, onGetBarcode }) => {
  const [productName, setProductName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const requests = new Requests();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const inputRef = React.useRef<any>(null);

  // Load locations and categories when modal becomes visible
  useEffect(() => {
    const loadLocationsAndCategories = async () => {
      if (visible) {
        try {
          const response = await requests.getLocationsAndCategories();
          console.log("Locations fetched:", response.locations);
          console.log("Categories fetched:", response.categories);
          setLocations(response.locations || []);
          setCategories(response.categories || []);
        } catch (error) {
          console.error("Error fetching locations and categories:", error);
        }
      }
    };

    loadLocationsAndCategories();
  }, [visible]); // Trigger effect when modal visibility changes

  // Watch for barcode changes and fetch product name if barcode exists
  useEffect(() => {
    const fetchProductName = async () => {
      if (barcode && scanning) {  // Only fetch if we're actively scanning
        try {
          setProductName('Looking up barcode...');
          // Fetch barcode data from the backend
          const barcodeData = await onGetBarcode(barcode);
          if (barcodeData && barcodeData.name) {
            // Autofill product name if the barcode data exists
            setProductName(barcodeData.name);
          } else {
            // Clear product name if barcode doesn't exist
            setProductName('');
          }
        } catch (error) {
          console.error("Error fetching barcode data:", error);
          setProductName('');
        }
      }
    };

    fetchProductName();
  }, [barcode]); // Trigger effect when barcode changes

  // Update the debounced search effect
  useEffect(() => {
    const searchProducts = async () => {
      if (productName.length >= 2 && !suggestionSelected) {
        const hid = await AsyncStorage.getItem('active-household');
        if (hid) {
          const results = await requests.searchProducts(productName, hid);
          setSuggestions(results);
          setShowSuggestions(true);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 600);
    return () => clearTimeout(timeoutId);
  }, [productName, suggestionSelected]);

  const handleSuggestionPress = (suggestion: ProductSuggestion) => {
    setProductName(suggestion.name);
    if (suggestion.barcode) {
      setBarcode(suggestion.barcode);
    }
    setShowSuggestions(false);
    setSuggestionSelected(true);
  };

  // Update product name change handler
  const handleProductNameChange = (text: string) => {
    setProductName(text);
    setSuggestionSelected(false); // Reset the selection flag when user types
  };

  // Handle barcode scanning
  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanning(false);
    setBarcode(data);
  };

  // Handle product submission
  const handleAddProduct = async () => {
    // Validate the expiration date before proceeding
    if (!validateExpirationDate(expirationDate) && expirationDate !== '') {
      console.error("Invalid date format. Please use YYYY-MM-DD.");
      return; // Prevent making the request if the date format is invalid
    }

    const newProduct: Product = {
      product_name: productName,
      barcode: barcode,
      expiration_date: expirationDate,
      location: location,
      category: category,
      product_id: '',
      wasted: false,
      creation_date: new Date().toISOString(),
      note: note,
      isExpired: false,
      daysUntilExpiration: 0
    };

    try {
      console.log("Barcode check condition:", barcode, productName);

      // Attempt to fetch barcode data
      let barcodeData = null;
      if (barcode) {
        try {
          barcodeData = await onGetBarcode(barcode);
        } catch (error) {
          console.error("Error fetching barcode data:", error);
        }
      }

      // If barcode data is not found or the source is external (meaning
      // not attached to the current household), add the barcode to the database.
      if ((!barcodeData || barcodeData.ext) && barcode && productName && productName != barcodeData?.name) {
        console.log("Barcode not found. Adding to database...");

        const barcodeSaved = onAddBarcode(barcode, productName);
        if (!barcodeSaved) {
          console.error("Failed to add barcode to the database");
        } else {
          console.log("Barcode added successfully");
        }
      }

      // Will call the onAddProduct callback with the new product.
      const success = await onAddProduct(newProduct);
      if (success) {
        onClose();
        resetForm();
      } else {
        console.error("Failed to add product!!");
      }

    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  // Helper function to validate the date format
  function validateExpirationDate(date: string): boolean {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
    return datePattern.test(date);
  }

  // Helper function to reset form fields
  const resetForm = () => {
    setProductName('');
    setBarcode('');
    setExpirationDate('');
    setLocation('');
    setCategory('');
    setSuggestionSelected(false);
    setShowSuggestions(false);
  };

  // Update function to handle background press
  const handleBackgroundPress = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    Keyboard.dismiss();
    setShowSuggestions(false);
  };

  // Add handler for input blur
  const handleInputBlur = () => {
    Keyboard.dismiss();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={GlobalStyles.modalContent}>
        <Text>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} theme={{ colors: { primary: colors.primary } }}>
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <>
      <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={GlobalStyles.modalContent}>
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View>
            <View style={styles.inputContainer}>
              <PaperTextInput
                ref={inputRef}
                style={GlobalStyles.input}
                mode="outlined"
                label="Product Name"
                value={productName}
                onChangeText={handleProductNameChange}
                onFocus={() => !suggestionSelected && setShowSuggestions(true)}
                onBlur={handleInputBlur}
                blurOnSubmit={true}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ScrollView 
                  style={styles.suggestionsContainer}
                  keyboardShouldPersistTaps="handled"
                >
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(suggestion)}
                    >
                      <Text style={styles.suggestionText}>
                        {suggestion.name}
                        {suggestion.barcode && (
                          <Text style={styles.barcodeText}> (Barcode: {suggestion.barcode})</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Display the barcode instead of an input field */}
            {barcode ? (
              <Text>Barcode: {barcode}</Text>
            ) : (
              <Button
                icon="barcode-scan"
                onPress={() => setScanning(true)}
                theme={{ colors: { primary: colors.primary } }}
              >
                Scan Barcode
              </Button>
            )}
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Expiration Date (YYYY-MM-DD)"
              value={expirationDate}
              onFocus={() => setIsDatePickerVisible(true)}
              editable={false}
              right={<PaperTextInput.Icon icon="calendar" onPress={() => setIsDatePickerVisible(true)} />}
            />
            {isDatePickerVisible && (
              <Calendar
                onDayPress={(day: any) => {
                  setExpirationDate(day.dateString);
                  setIsDatePickerVisible(false);
                }}
              />
            )}
            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setLocationModalVisible(true)}>
              {location ? `Location: ${location}` : 'Select Location'}
            </Button>
            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => setCategoryModalVisible(true)}>
              {category ? `Category: ${category}` : 'Select Category'}
            </Button>
            {/* Clear Button */}
            <View style={{ alignItems: 'center' }}>
              <Button
                mode="contained-tonal"
                onPress={resetForm}
                style={[styles.clearButton]}
              >
                Clear
              </Button>
            </View>
            <Button mode="contained" onPress={handleAddProduct} theme={{ colors: { primary: colors.primary } }}>
              Submit
            </Button>
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* Location Picker Modal */}
        <PaperModal
          visible={locationModalVisible}
          onDismiss={() => setLocationModalVisible(false)}
          contentContainerStyle={GlobalStyles.modalContent}
        >
          <Picker selectedValue={location} style={GlobalStyles.picker} onValueChange={(value) => {
            setLocation(value);
            setLocationModalVisible(false);
          }}>
            <Picker.Item label="Select Location" value="" />
            {locations.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </PaperModal>

        {/* Category Picker Modal */}
        <PaperModal
          visible={categoryModalVisible}
          onDismiss={() => setCategoryModalVisible(false)}
          contentContainerStyle={GlobalStyles.modalContent}
        >
          <Picker selectedValue={category} style={GlobalStyles.picker} onValueChange={(value) => {
            setCategory(value);
            setCategoryModalVisible(false);
          }}>
            <Picker.Item label="Select Category" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </PaperModal>
      </PaperModal>

      {/* Camera Scanner Modal */}
      {scanning && (
        <View style={styles.cameraModal}>
          <CameraView
            style={styles.cameraView}
            facing={facing}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <Button onPress={() => setScanning(false)} theme={{ colors: { primary: colors.primary } }}>
            Cancel
          </Button>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  cameraModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraView: {
    width: '100%',
    height: '90%',
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    color: colors.input,
    borderWidth: 1,
    width: '50%',
    marginBottom: 20,
    marginTop: 10,
  },
  barcodeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default AddProductModal;