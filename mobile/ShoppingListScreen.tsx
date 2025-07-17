import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { IconButton, Button, Card, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import { HouseholdManager } from './HouseholdManager';

interface ShoppingListItem {
  id: string;
  product_name: string;
  added_by: string;
  added_timestamp: number;
  note: string;
  quantity: number;
}

const ShoppingListScreen = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleMarkCompleted = async (itemId: string) => {
    try {
      const success = await requests.markShoppingItemCompleted(itemId);
      if (success) {
        setShoppingList(prev => prev.filter(item => item.id !== itemId));
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

  if (loading) {
    return (
      <View style={[GlobalStyles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading shopping list...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.subtitle}>
          {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''}
        </Text>
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
            <Card key={item.id} style={styles.itemCard}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product_name}
                    </Text>
                    <Text style={styles.itemDate}>
                      Added {formatDate(item.added_timestamp)}
                    </Text>
                    {item.note && (
                      <Text style={styles.itemNote}>{item.note}</Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarkCompleted(item.id)}
                    >
                      <Icon name="check-circle-outline" size={24} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Icon name="delete-outline" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    padding: 16,
  },
  itemHeader: {
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
  itemDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemNote: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});

export default ShoppingListScreen; 