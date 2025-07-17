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
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 20,
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
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
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
  },
  cancelButtonText: {
    color: colors.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: colors.surface,
  },
});

export default ShoppingListModal; 