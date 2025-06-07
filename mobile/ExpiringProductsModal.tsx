import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Product } from './Product';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { parse, differenceInDays } from 'date-fns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ExpiringProductsModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  onProductPress: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onWaste?: (product: Product) => void;
  onUpdateProduct?: (updatedProduct: Product) => void;
}

const ExpiringProductsModal: React.FC<ExpiringProductsModalProps> = ({
  visible,
  onClose,
  products,
  onProductPress,
  onDelete,
  onWaste,
  onUpdateProduct,
}) => {
  const calculateDaysLeft = (expirationDate: string): string => {
    if (!expirationDate) return 'No date';
    try {
      const expDate = parse(expirationDate, 'LLL dd yyyy', new Date());
      const days = differenceInDays(expDate, new Date());
      if (days < 0) return 'Expired';
      return `${days} days`;
    } catch (error) {
      console.error(`Error calculating days left for ${expirationDate}:`, error);
      return 'Invalid date';
    }
  };

  const handleProductPress = (product: Product) => {
    console.log('Product pressed in ExpiringProductsModal:', product);
    onProductPress(product); // Call onProductPress first to show the details
    onClose(); // Then close the expiring products modal
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.modalWrapper}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Expiring Products ({products.length})</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
            />
          </View>

          {products.length === 0 ? (
            <Text style={styles.noProducts}>No products expiring soon</Text>
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {products.map((product) => {
                const daysLeft = calculateDaysLeft(product.expiration_date ?? '');
                return (
                  <TouchableOpacity
                    key={product.product_id}
                    style={styles.productItem}
                    onPress={() => handleProductPress(product)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.product_name}</Text>
                      <Text style={styles.location}>{product.location || 'No Location'}</Text>
                    </View>
                    <Text style={[
                      styles.daysLeft,
                      daysLeft === 'Expired' ? styles.expired : styles.expiring
                    ]}>
                      {daysLeft}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollView: {
    maxHeight: screenHeight * 0.6,
  },
  scrollContent: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expired: {
    color: 'white',
    backgroundColor: colors.error,
  },
  expiring: {
    color: 'white',
    backgroundColor: colors.warning,
  },
  noProducts: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    padding: 20,
  },
});

export default ExpiringProductsModal; 