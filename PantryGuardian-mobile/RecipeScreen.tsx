import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { TextInput, Button, Card, ActivityIndicator, Chip } from 'react-native-paper';
import Requests from './Requests';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RecipeScreen = () => {
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<string | null>(null);
  const requests = new Requests();

  const handleGenerateRecipe = async () => {
    if (!ingredients) {
      alert('Please enter ingredients');
      return;
    }
    setLoading(true);
    setRecipe(null);

    try {
      const recipe = await requests.generateRecipe(ingredients);
      setRecipe(recipe);
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipeFromDatabase = async () => {
    setLoading(true);
    setRecipe(null);

    try {
      const recipe = await requests.generateRecipeFromDatabase();
      setRecipe(recipe);
    } catch (error) {
      console.error('Error generating recipe from database:', error);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestions = () => {
    const suggestions = ['tomatoes', 'pasta', 'chicken', 'rice', 'eggs'];
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionsContainer}
      >
        {suggestions.map((item, index) => (
          <Chip
            key={index}
            mode="outlined"
            onPress={() => setIngredients(ingredients ? `${ingredients}, ${item}` : item)}
            style={styles.suggestionChip}
            textStyle={styles.suggestionText}
          >
            {item}
          </Chip>
        ))}
      </ScrollView>
    );
  };

  return (
    <ScrollView style={[GlobalStyles.container, styles.container]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chef-hat" size={40} color={colors.textInverse} />
        <Text style={styles.headerTitle}>Recipe Generator</Text>
        <Text style={styles.headerSubtitle}>Turn your ingredients into delicious meals</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.inputCard}>
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Enter ingredients"
              value={ingredients}
              onChangeText={setIngredients}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="e.g., chicken, rice, tomatoes"
              theme={{ colors: { primary: colors.primary } }}
              left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="food" size={24} color={colors.primary} />} />}
            />
            {renderSuggestions()}
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleGenerateRecipe}
                loading={loading}
                disabled={loading}
                style={styles.generateButton}
                contentStyle={styles.buttonContent}
                icon="chef-hat"
              >
                Recipe
              </Button>
              <Button
                mode="contained-tonal"
                onPress={handleGenerateRecipeFromDatabase}
                loading={loading}
                disabled={loading}
                style={styles.databaseButton}
                contentStyle={styles.buttonContent}
                icon="database"
              >
                From Pantry
              </Button>
            </View>
          </Card.Content>
        </Card>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cooking up something special...</Text>
          </View>
        )}

        {recipe && (
          <Card style={styles.recipeCard}>
            <Card.Content>
              <View style={styles.recipeHeader}>
                <MaterialCommunityIcons name="book-open-variant" size={24} color={colors.primary} />
                <Text style={styles.recipeTitle}>Your Recipe</Text>
              </View>
              <Text style={styles.recipeText}>{recipe}</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textInverse,
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    padding: 16,
    marginTop: -30,
  },
  inputCard: {
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  input: {
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  suggestionChip: {
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  suggestionText: {
    color: colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  generateButton: {
    flex: 1,
    marginRight: 8,
  },
  databaseButton: {
    flex: 1,
    marginLeft: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  recipeCard: {
    marginTop: 20,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 10,
  },
  recipeText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
});

export default RecipeScreen;
