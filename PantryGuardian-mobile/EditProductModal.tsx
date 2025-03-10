import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet, Image, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Button, Modal as PaperModal, TextInput as PaperTextInput } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      setProductImage(product.image_url || null);
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

  const handleUpdateProduct = async () => {
    if (!product) return;
    
    setIsLoading(true);
    try {
      let imageUrl: string | undefined = productImage || undefined;
      
      // If productImage is a local file URI (not a URL), upload it
      if (productImage && !productImage.startsWith('http')) {
        try {
          const uploadedUrl = await requests.uploadProductImage(productImage);
          imageUrl = uploadedUrl || undefined;
        } catch (error) {
          console.error("Error uploading image:", error);
          imageUrl = undefined;
        }
      }

      // Trim values and convert empty strings to undefined
      const trimmedLocation = location.trim();
      const trimmedCategory = category.trim();
      const trimmedNote = note.trim();

      const updatedProduct: Product = {
        ...product,
        product_name: productName.trim(),
        expiration_date: expirationDate || undefined,
        location: trimmedLocation || undefined,
        category: trimmedCategory || undefined,
        note: trimmedNote || undefined,
        image_url: imageUrl,
        wasted: product.wasted,
        isExpired: product.isExpired,
        daysUntilExpiration: product.daysUntilExpiration
      };

      console.log('Updating product with:', updatedProduct);
      await onUpdateProduct(updatedProduct);
      onClose();
    } catch (error) {
      console.error("Error updating product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    if (product) {
      setProductName(product.product_name || '');
      setExpirationDate(product.expiration_date || '');
      setLocation(product.location || '');
      setCategory(product.category || '');
      setNote(product.note || '');
      setProductImage(product.image_url || null);
    }
  };

  return (
    <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={[GlobalStyles.modalContent, styles.modalContainer]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <TouchableWithoutFeedback onPress={() => setIsDatePickerVisible(false)}>
          <View>
            {/* Product Image Section */}
            <View style={styles.imageSection}>
              <Text style={styles.sectionTitle}>Product Image</Text>
              <View style={styles.imageContainer}>
                {productImage ? (
                  <>
                    <Image source={{ uri: productImage }} style={styles.productImage} />
                    <View style={styles.imageOverlay}>
                      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                        <Icon name="image-edit" size={24} color={colors.primary} />
                        <Text style={styles.buttonText}>Change Image</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.imageButton, styles.removeButton]} 
                        onPress={() => setProductImage(null)}
                      >
                        <Icon name="delete" size={24} color={colors.error} />
                        <Text style={[styles.buttonText, styles.removeText]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                    <Icon name="image-plus" size={40} color={colors.primary} />
                    <Text style={styles.addImageText}>Add Product Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Existing form fields */}
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
                disabled={isLoading}
              >
                Clear
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdateProduct}
                style={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.surface} size="small" />
                    <Text style={styles.loadingText}>Updating...</Text>
                  </View>
                ) : (
                  'Update'
                )}
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

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
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            style={GlobalStyles.picker}
            onValueChange={handleCategoryChange}
          >
            <Picker.Item label="Select Category" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </PaperModal>
    </PaperModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '90%',
    padding: 0,
  },
  scrollView: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  imageContainer: {
    height: 200,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: colors.surfaceVariant,
  },
  buttonText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '500',
  },
  removeText: {
    color: colors.error,
  },
  addImageButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.surface,
    marginLeft: 8,
  },
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
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default EditProductModal;
