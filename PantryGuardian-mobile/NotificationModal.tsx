import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { List, Modal as PaperModal, Button } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { calculateDaysLeft } from './utils/dateUtils';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  products,
}) => {
  return (
    <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={[GlobalStyles.modalContent, styles.notificationModal]}>
      <Text style={GlobalStyles.modalTitle}>Expiring Products</Text>
      <ScrollView style={[GlobalStyles.productList, styles.notificationModalList]}>
        <List.Section>
          {products.map((product) => (
            <TouchableWithoutFeedback key={product.product_id}>
              <View style={GlobalStyles.productContainer}>
                <View style={GlobalStyles.productInfo}>
                  <Text style={GlobalStyles.productName}>{product.product_name}</Text>
                  <Text style={GlobalStyles.location}>{product.location}</Text>
                </View>
                <Text
  style={[
    GlobalStyles.expirationTextContainer,
    product.expiration_date && new Date(product.expiration_date) < new Date()
      ? GlobalStyles.expirationText
      : { color: colors.onProductBackground },
  ]}
>
  {calculateDaysLeft(product.expiration_date ?? null)}
</Text>
              </View>
            </TouchableWithoutFeedback>
          ))}
        </List.Section>
      </ScrollView>
      <Button onPress={onClose} mode="contained">
        Close
      </Button>
    </PaperModal>
  );
};

const styles = StyleSheet.create({
    notificationModal: {
    },
    notificationModalList: {
        marginBottom: 20,
        maxHeight: '100%',
    },
  });

export default NotificationModal;