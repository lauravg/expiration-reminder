import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';

const plans = [
  {
    id: 'free',
    name: 'Free Plan',
    price: 'Free',
    features: ['Basic Features', 'Limited Storage'],
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    price: '$9.99/month',
    features: ['All Free Features', 'Priority Support', 'Increased Storage'],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: '$19.99/month',
    features: ['All Standard Features', 'Unlimited Storage', 'Exclusive Features'],
  },
];

const SubscriptionScreen = () => {
  const [selectedPlan, setSelectedPlan] = useState('free');

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = () => {
    alert(`Upgraded to ${plans.find((plan) => plan.id === selectedPlan)?.name}`);
    // Add payment or API logic here
  };

  return (
    <View style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.planList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === item.id && styles.selectedCard, // Highlight selected card
            ]}
            onPress={() => handleSelectPlan(item.id)}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{item.name}</Text>
              {selectedPlan === item.id && (
                <IconButton
                  icon="check-circle"
                  size={20}
                  iconColor={colors.primary}
                  style={styles.checkIcon}
                />
              )}
            </View>
            <Text style={styles.planPrice}>{item.price}</Text>
            <View style={styles.featuresList}>
              {item.features.map((feature, index) => (
                <Text key={index} style={styles.feature}>
                  • {feature}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        )}
      />

      <Button
        mode="contained"
        theme={{ colors: { primary: colors.primary } }}
        style={styles.upgradeButton}
        onPress={handleUpgrade}
        disabled={selectedPlan === 'free'} // Disable button for Free Plan
      >
        {selectedPlan === 'free' ? 'Free Plan Selected' : 'Upgrade to Plan'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: colors.primary,
  },
  planList: {
    paddingHorizontal: 16,
  },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 8,
  },
  featuresList: {
    marginTop: 8,
  },
  feature: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  checkIcon: {
    margin: 0,
  },
  upgradeButton: {
    marginHorizontal: 16,
    marginVertical: 20,
  },
});

export default SubscriptionScreen;