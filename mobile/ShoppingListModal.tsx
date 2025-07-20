import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from './theme';
import GlobalStyles from './GlobalStyles';

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (productName: string, note?: string, quantity?: number) => void;
  productName: string;
}

const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  visible,
  onClose,
  onConfirm,
  productName,
}) => {
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState('1');

  const handleConfirm = () => {
    const quantityNum = parseInt(quantity) || 1;
    onConfirm(productName, note.trim() || undefined, quantityNum);
    setNote('');
    setQuantity('1');
    onClose();
  };

  const handleCancel = () => {
    setNote('');
    setQuantity('1');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to Shopping List</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.question}>
              Would you like to add "{productName}" to your shopping list?
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quantity:</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Note (optional):</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonText}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={styles.confirmButton}
              labelStyle={styles.confirmButtonText}
            >
              Add to List
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceVariant,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceVariant,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  confirmButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShoppingListModal; 