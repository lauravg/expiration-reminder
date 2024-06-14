import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import Requests from './Requests';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';

const requests = new Requests();

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
      const recipe = await requests.generateRecipe(ingredients);
      setRecipe(recipe);
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <View style={GlobalStyles.content}>
        <TextInput
          mode="outlined"
          label="Enter ingredients"
          value={ingredients}
          onChangeText={setIngredients}
          style={GlobalStyles.input}
          theme={{ colors: { primary: colors.primary } }}
        />
        <Button
          mode="contained"
          onPress={handleGenerateRecipe}
          loading={loading}
          disabled={loading}
          style={GlobalStyles.button}
          theme={{ colors: { primary: colors.primary } }}
        >
          Generate Recipe
        </Button>
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
