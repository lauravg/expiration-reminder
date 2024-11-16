import React, { useState, useEffect } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';
import Requests from './Requests';
import moment from 'moment';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ visible, onClose, onProductAdded }) => {
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
  const requests = new Requests();

  // Load locations and categories on component mount
  useEffect(() => {
    const loadLocationsAndCategories = async () => {
      const response = await requests.getLocationsAndCategories();
      setLocations(response.locations || []);
      setCategories(response.categories || []);
    };
    loadLocationsAndCategories();
  }, []);

  // Watch for barcode changes and fetch product name if barcode exists
  useEffect(() => {
    const fetchProductName = async () => {
      if (barcode) {
        try {
          // Fetch barcode data from the backend
          const barcodeData = await requests.getBarcodeData(barcode);
          if (barcodeData) {
          // Autofill product name if the barcode exists
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
  
    const newProduct = {
      product_name: productName,
      barcode: barcode,
      expiration_date: expirationDate,
      location: location,
      category: category,
      product_id: '',
      wasted: false,
      creation_date: new Date().toISOString(),
    };
  
    try {
      console.log("Barcode check condition:", barcode, productName);
  
      // Attempt to fetch barcode data
      let barcodeData = null;
      if (barcode) {
        try {
          barcodeData = await requests.getBarcodeData(barcode);
        } catch (error) {
          console.error("Error fetching barcode data:", error);
        }
      }
  
      // If barcode data is not found, add the barcode to the database
      if (!barcodeData && barcode) {
        console.log("Barcode not found. Adding to database...");
        const barcodeSaved = await requests.addBarcodeToDatabase({
          barcode: barcode,
          name: productName || "Unnamed Product",
        });
        if (!barcodeSaved) {
          console.error("Failed to add barcode to the database");
        } else {
          console.log("Barcode added successfully");
        }
      }
  
      // Add the product to the database
      const success = await requests.addProduct(newProduct);
      if (success) {
        onProductAdded();
        onClose();
        resetForm();
      } else {
        console.error("Failed to add product");
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
        <TouchableWithoutFeedback onPress={() => setIsDatePickerVisible(false)}>
          <View>
            <PaperTextInput
              style={GlobalStyles.input}
              mode="outlined"
              label="Product Name"
              value={productName}
              onChangeText={setProductName}
            />
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
              onChangeText={setExpirationDate}
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
          </View>
        </TouchableWithoutFeedback>

        {/* Location Picker Modal */}
        <PaperModal
          visible={locationModalVisible}
          onDismiss={() => setLocationModalVisible(false)}
          contentContainerStyle={GlobalStyles.modalContent}
        >
          <Picker selectedValue={location} style={GlobalStyles.picker} onValueChange={setLocation}>
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
          <Picker selectedValue={category} style={GlobalStyles.picker} onValueChange={setCategory}>
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
  clearButton: {
    backgroundColor: colors.productBackground,
    borderColor: colors.border,
    color: colors.input,
    borderWidth: 1,
    width: '50%',
    marginBottom: 20,
    marginTop: 10,
  }
});

export default AddProductModal;