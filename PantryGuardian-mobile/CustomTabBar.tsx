import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {colors} from './theme'
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
              onPress={toggleAddProductModal} // Handle the modal toggle here
              style={styles.addButton}
            >
              <MaterialIcons name="add" size={40} color={colors.onPrimary} />
            </TouchableOpacity>
          );
        }

        let iconName: keyof typeof MaterialIcons.glyphMap = 'circle'; // Default icon
        if (route.name === 'Inventory') {
          iconName = 'kitchen';
        } else if (route.name === 'Recipe') {
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
            style={styles.tabButton}
          >
            <MaterialIcons
              name={iconName}
              size={24}
              color={isFocused ? colors.primary : colors.icon}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: colors.navBackground,
    borderTopColor: colors.border,
    borderWidth: .3,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // TBD change tabButton color
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
});

export default CustomTabBar;
