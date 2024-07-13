import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import Requests from './Requests';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RecipeScreen = () => {
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<string | null>(null);

  const handleGenerateRecipe = async () => {
    if (!ingredients) {
      alert('Please enter ingredients');
      return;
    }
    setLoading(true);
    setRecipe(null);

    try {
      const recipe = await Requests.generateRecipe(ingredients);
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
      const recipe = await Requests.generateRecipeFromDatabase();
      setRecipe(recipe);
    } catch (error) {
      console.error('Error generating recipe from database:', error);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[GlobalStyles.container, GlobalStyles.background]}>
      <View style={GlobalStyles.content}>
        <Text style={GlobalStyles.sectionHeader}>Generate a Recipe</Text>
        <TextInput
          mode="outlined"
          label="Enter ingredients"
          value={ingredients}
          onChangeText={setIngredients}
          style={GlobalStyles.input}
          theme={{ colors: { primary: colors.primary } }}
          left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="food" size={24} color={colors.primary} />} />}
        />
        <View style={GlobalStyles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleGenerateRecipe}
            loading={loading}
            disabled={loading}
            theme={{ colors: { primary: colors.primary } }}
            icon="chef-hat"
          >
            Generate Recipe
          </Button>
          <Button
            mode="contained"
            onPress={handleGenerateRecipeFromDatabase}
            loading={loading}
            disabled={loading}
            theme={{ colors: { primary: colors.primary } }}
            icon="database"
          >
            From Database
          </Button>
        </View>
        {loading && <ActivityIndicator size="large" color={colors.primary} />}
        {recipe && (
          <Card style={GlobalStyles.card}>
            <Card.Content>
              <Text style={GlobalStyles.recipeText}>{recipe}</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

export default RecipeScreen;
