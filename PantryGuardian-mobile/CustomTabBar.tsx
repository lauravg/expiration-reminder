import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, theme } from './theme';

interface CustomTabBarProps extends BottomTabBarProps {
  toggleAddProductModal: () => void;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation, toggleAddProductModal }) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === 'AddProduct') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={toggleAddProductModal}
              style={styles.addButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={32} color={colors.textInverse} />
            </TouchableOpacity>
          );
        }

        let iconName: keyof typeof MaterialIcons.glyphMap = 'home';
        if (route.name === 'Inventory') {
          iconName = 'list';
        } else if (route.name === 'Generate Recipe') {
          iconName = 'restaurant';
        } else if (route.name === 'Wasted') {
          iconName = 'compost';
        } else if (route.name === 'Settings') {
          iconName = 'settings';
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tabButton, isFocused && styles.tabButtonFocused]}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={iconName} 
              size={24} 
              color={isFocused ? colors.primary : colors.textSecondary} 
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 0.3,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabButtonFocused: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: theme.roundness,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default CustomTabBar;