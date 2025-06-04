import React, { useState, useEffect } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet, ScrollView, TouchableOpacity, Keyboard, Image } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';
import Requests from './Requests';
import moment from 'moment';
import { Product, Barcode } from './Product';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HouseholdManager } from './HouseholdManager';

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
  const [productImage, setProductImage] = useState<string | null>(null);
  const requests = new Requests();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const inputRef = React.useRef<any>(null);
  const householdManager = new HouseholdManager(requests);

  // Load locations and categories when modal becomes visible
  useEffect(() => {
    const loadLocationsAndCategories = async () => {
      if (visible) {
        try {
          const activeHouseholdId = await householdManager.getActiveHouseholdId();
          if (activeHouseholdId) {
            const response = await requests.getLocationsAndCategories(activeHouseholdId);
            console.log("Locations fetched:", response.locations);
            console.log("Categories fetched:", response.categories);
            setLocations(response.locations || []);
            setCategories(response.categories || []);
          }
        } catch (error) {
          console.error("Error fetching locations and categories:", error);
        }
      }
    };

    loadLocationsAndCategories();
  }, [visible]);

  // Watch for barcode changes and fetch product name if barcode exists
  useEffect(() => {
    const fetchProductName = async () => {
      let wereScanning = scanning;
      setScanning(false);
      if (barcode && wereScanning) {  // Only fetch if we're actively scanning
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
    setBarcode(data);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      setProductImage(selectedImage);
    }
  };

  // Handle product submission
  const handleAddProduct = async () => {
    // Validate the expiration date before proceeding
    if (!validateExpirationDate(expirationDate) && expirationDate !== '') {
      console.error("Invalid date format. Please use YYYY-MM-DD.");
      return;
    }

    let imageUrl = null;
    if (productImage) {
      try {
        imageUrl = await requests.uploadProductImage(productImage);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
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
      daysUntilExpiration: 0,
      image_url: imageUrl || undefined,
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
    setProductImage(null);
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
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Product Name Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Information</Text>
              <View style={styles.inputContainer}>
                <PaperTextInput
                  ref={inputRef}
                  style={[GlobalStyles.input, styles.input]}
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

              {/* Product Image Section */}
              <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                {productImage ? (
                  <Image source={{ uri: productImage }} style={styles.productImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Icon name="camera" size={40} color={colors.textSecondary} />
                    <Text style={styles.imagePlaceholderText}>Add Product Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Barcode Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Barcode</Text>
              {barcode ? (
                <View style={styles.barcodeDisplay}>
                  <Icon name="barcode" size={20} color={colors.primary} />
                  <Text style={styles.barcodeDisplayText}>{barcode}</Text>
                </View>
              ) : (
                <Button
                  icon="barcode-scan"
                  mode="outlined"
                  onPress={() => setScanning(true)}
                  style={styles.button}
                  theme={{ colors: { primary: colors.primary } }}
                >
                  Scan Barcode
                </Button>
              )}
            </View>

            {/* Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              
              <PaperTextInput
                style={[GlobalStyles.input, styles.input]}
                mode="outlined"
                label="Expiration Date (YYYY-MM-DD)"
                value={expirationDate}
                onFocus={() => setIsDatePickerVisible(true)}
                editable={false}
                right={<PaperTextInput.Icon icon="calendar" onPress={() => setIsDatePickerVisible(true)} />}
              />
              
              {isDatePickerVisible && (
                <View style={styles.calendarContainer}>
                  <Calendar
                    onDayPress={(day: any) => {
                      setExpirationDate(day.dateString);
                      setIsDatePickerVisible(false);
                    }}
                  />
                </View>
              )}
              
              <Button 
                mode="outlined"
                onPress={() => setLocationModalVisible(true)}
                style={styles.button}
                theme={{ colors: { primary: colors.primary } }}
              >
                {location ? `Location: ${location}` : 'Select Location'}
              </Button>
              
              <Button 
                mode="outlined"
                onPress={() => setCategoryModalVisible(true)}
                style={styles.button}
                theme={{ colors: { primary: colors.primary } }}
              >
                {category ? `Category: ${category}` : 'Select Category'}
              </Button>
              
              <PaperTextInput
                style={[GlobalStyles.input, styles.input]}
                mode="outlined"
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Action Buttons Section */}
            <View style={styles.actionSection}>
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={resetForm}
                  style={[styles.button, styles.clearButton]}
                  labelStyle={styles.clearButtonText}
                >
                  Clear
                </Button>
                
                <Button 
                  mode="contained" 
                  onPress={handleAddProduct} 
                  style={[styles.button, styles.submitButton]}
                  theme={{ colors: { primary: colors.primary } }}
                >
                  Add Product
                </Button>
              </View>
            </View>
          </ScrollView>
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
  scrollContainer: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textPrimary,
  },
  input: {
    marginBottom: 10,
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
  barcodeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  imagePickerContainer: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textSecondary,
  },
  barcodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  barcodeDisplayText: {
    marginLeft: 10,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  button: {
    marginBottom: 10,
  },
  calendarContainer: {
    marginBottom: 10,
  },
  actionSection: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  clearButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    flex: 1,
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
});

export default AddProductModal;