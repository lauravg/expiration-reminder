import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { IconButton, Button, Card, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { HouseholdManager } from './HouseholdManager';
import { Product } from './Product';
import { Calendar } from 'react-native-calendars';

interface ShoppingListItem {
  id: string;
  product_name: string;
  added_by: string;
  added_timestamp: number;
  note: string;
  quantity: number;
  completed?: boolean;
}

const ShoppingListScreen = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPantryModalVisible, setAddToPantryModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [newQuantity, setNewQuantity] = useState('1');
  const [expirationDate, setExpirationDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      const hid = await householdManager.getActiveHouseholdId();
      if (hid) {
        const items = await requests.getShoppingList(hid);
        setShoppingList(items);
      }
    } catch (error) {
      console.error('Error loading shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadShoppingList();
    }, [])
  );

  const handleMarkCompleted = async (item: ShoppingListItem) => {
    // If item is already completed, allow adding to pantry
    if (item.completed) {
      setSelectedItem(item);
      setNewQuantity(item.quantity.toString());
      setExpirationDate('');
      setAddToPantryModalVisible(true);
      return;
    }

    setSelectedItem(item);
    setNewQuantity(item.quantity.toString());
    setExpirationDate('');
    setAddToPantryModalVisible(true);
  };

  const handleAddToPantry = async () => {
    if (!selectedItem) return;

    // Check if no expiration date is provided
    if (!expirationDate.trim()) {
      Alert.alert(
        'No Expiration Date',
        'Are you sure you don\'t want to add an expiration date? This will help you track when the product expires.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Without Date',
            onPress: () => addProductToPantry(),
          }
        ]
      );
      return;
    }

    // If expiration date is provided, proceed directly
    addProductToPantry();
  };

  const addProductToPantry = async () => {
    if (!selectedItem) return;

    try {
      const hid = await householdManager.getActiveHouseholdId();
      if (!hid) {
        Alert.alert('Error', 'No active household found');
        return;
      }

      const quantity = parseInt(newQuantity) || 1;
      const newProduct: Product = {
        product_name: selectedItem.product_name,
        expiration_date: expirationDate || undefined,
        location: 'Pantry', // Default location
        category: '',
        note: selectedItem.note || '',
        product_id: '',
        wasted: false,
        creation_date: new Date().toISOString(),
        isExpired: false,
        daysUntilExpiration: 0,
        opened: false,
        used: false,
      };

      const success = await requests.addProduct(newProduct, hid);

      if (success) {
        // Remove from shopping list (whether completed or not)
        const deleteSuccess = await requests.deleteShoppingItem(selectedItem.id);
        if (deleteSuccess) {
          setShoppingList(prev => prev.filter(item => item.id !== selectedItem.id));
        }
        setAddToPantryModalVisible(false);
        setSelectedItem(null);
        setExpirationDate('');
        setNewQuantity('1');
        setShowDatePicker(false);
        Alert.alert('Success', 'Product added to pantry!');
      } else {
        Alert.alert('Error', 'Failed to add product to pantry');
      }
    } catch (error) {
      console.error('Error adding product to pantry:', error);
      Alert.alert('Error', 'Failed to add product to pantry');
    }
  };

  const handleDontAdd = async () => {
    if (!selectedItem) return;

    try {
      // Mark as completed without adding to pantry
      const success = await requests.markShoppingItemCompleted(selectedItem.id);
      if (success) {
        // Update the item in the list to show as completed
        setShoppingList(prev => prev.map(item => 
          item.id === selectedItem.id 
            ? { ...item, completed: true }
            : item
        ));
        setAddToPantryModalVisible(false);
        setSelectedItem(null);
        setExpirationDate('');
        setNewQuantity('1');
        setShowDatePicker(false);
      } else {
        Alert.alert('Error', 'Failed to mark item as completed');
      }
    } catch (error) {
      console.error('Error marking item as completed:', error);
      Alert.alert('Error', 'Failed to mark item as completed');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item from your shopping list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await requests.deleteShoppingItem(itemId);
              if (success) {
                setShoppingList(prev => prev.filter(item => item.id !== itemId));
              } else {
                Alert.alert('Error', 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleDateSelect = (day: any) => {
    console.log('Date selected:', day.dateString);
    setExpirationDate(day.dateString);
    setShowDatePicker(false);
  };

  const handleDatePickerPress = () => {
    console.log('Date picker button pressed');
    setShowDatePicker(true);
  };

  // Debug logging for modal state
  useEffect(() => {
    console.log('showDatePicker state changed:', showDatePicker);
  }, [showDatePicker]);

  useEffect(() => {
    console.log('addToPantryModalVisible state changed:', addToPantryModalVisible);
  }, [addToPantryModalVisible]);

  if (loading) {
    return (
      <View style={[GlobalStyles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading shopping list...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <View style={[GlobalStyles.header, styles.headerContainer]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Shopping List</Text>
          <Text style={styles.subtitle}>
            {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your shopping list is empty</Text>
          <Text style={styles.emptySubtitle}>
            Items will appear here when you mark products as used, wasted, or deleted
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {shoppingList.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemContent}>
                <View style={styles.itemInfo}>
                  <Text style={item.completed ? styles.itemNameCompleted : styles.itemName}>
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product_name}
                  </Text>
                  <Text style={item.completed ? styles.itemDateCompleted : styles.itemDate}>
                    Added {formatDate(item.added_timestamp)}
                  </Text>
                  {item.note && (
                    <Text style={item.completed ? styles.itemNoteCompleted : styles.itemNote}>{item.note}</Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      console.log('Check button pressed for item:', item.product_name);
                      handleMarkCompleted(item);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Icon name="check-circle-outline" size={24} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      console.log('Delete button pressed for item:', item.product_name);
                      handleDeleteItem(item.id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Icon name="delete-outline" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add to Pantry Modal */}
      <Modal
        visible={addToPantryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setAddToPantryModalVisible(false);
          setSelectedItem(null);
          setExpirationDate('');
          setNewQuantity('1');
          setShowDatePicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Pantry</Text>
              <TouchableOpacity 
                onPress={() => {
                  setAddToPantryModalVisible(false);
                  setSelectedItem(null);
                  setExpirationDate('');
                  setNewQuantity('1');
                  setShowDatePicker(false);
                }} 
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalQuestion}>
                Would you like to add "{selectedItem?.product_name}" to your pantry?
                {selectedItem?.completed && ' (This item was previously marked as completed)'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Quantity:</Text>
                <TextInput
                  style={styles.textInput}
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Expiration Date (optional):</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={handleDatePickerPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.datePickerText}>
                    {expirationDate ? expirationDate : 'Select a date'}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {/* Inline Calendar - similar to EditProductModal */}
                {showDatePicker && (
                  <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                      <Text style={styles.calendarTitle}>Select Expiration Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={styles.calendarCloseButton}
                      >
                        <Icon name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Calendar
                      onDayPress={handleDateSelect}
                      markedDates={{
                        [expirationDate]: { selected: true, selectedColor: colors.primary }
                      }}
                      minDate={new Date().toISOString().split('T')[0]}
                      theme={{
                        selectedDayBackgroundColor: colors.primary,
                        selectedDayTextColor: colors.textInverse,
                        todayTextColor: colors.primary,
                        dayTextColor: colors.textPrimary,
                        textDisabledColor: colors.textSecondary,
                        arrowColor: colors.primary,
                        monthTextColor: colors.textPrimary,
                        indicatorColor: colors.primary,
                        textDayFontWeight: '300',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '300',
                        textDayFontSize: 16,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 13
                      }}
                    />
                  </View>
                )}
                
              </View>
            </View>

            <View style={styles.modalButtonContainer}>
              <Button
                mode="outlined"
                onPress={handleDontAdd}
                style={styles.modalCancelButton}
                labelStyle={styles.modalCancelButtonText}
              >
                Don't Add
              </Button>
              <Button
                mode="contained"
                onPress={handleAddToPantry}
                style={styles.modalConfirmButton}
                labelStyle={styles.modalConfirmButtonText}
              >
                Add to Pantry
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemNameCompleted: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemDateCompleted: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  itemNote: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  itemNoteCompleted: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    marginBottom: 24,
  },
  modalQuestion: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceVariant,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.surfaceVariant,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  modalCancelButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  modalConfirmButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calendarCloseButton: {
    padding: 8,
  },
});

export default ShoppingListScreen; 