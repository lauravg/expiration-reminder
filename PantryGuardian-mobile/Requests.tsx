import axios from 'axios';
import qs from 'qs';
import { Product } from './Product';
import AsyncStorage from '@react-native-async-storage/async-storage';

// interface Authenticator {
//   register?: (email: string, password: string) => Promise<boolean>;
//   login?: (email: string, password: string) => Promise<boolean>;
//   logout?: () => Promise<any>;
// }

const BASE_URL = "http://127.0.0.1:8081";

class Requests {
  // TODO: These should be stored in secure storage to persist.
  static refresh_token = "";
  static idToken = "";
  static displayName = "";

  constructor() { }

  async handleLogin(email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${BASE_URL}/auth`,
        qs.stringify({ email, password }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          // Prevent axios from following redirects
          maxRedirects: 0
        }
      );

      if (response.status >= 200 && response.status < 300) {
        Requests.refresh_token = response.data.rt;
        Requests.idToken = response.data.it;
        // Save the user's display name
        Requests.displayName = response.data.display_name;
        await AsyncStorage.setItem('idToken', Requests.idToken);
        await AsyncStorage.setItem('displayName', Requests.displayName);
      } else {
        console.error('Login failed.');
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login failed.');
      throw new Error('Login failed');
    }
    console.info('Login successful');
    return true;
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${BASE_URL}/register`,
        qs.stringify({ name, email, password }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Registration successful');
        return true;
      } else {
        console.error('Registration failed');
        return false;
      }
    } catch (error) {
      console.error('Registration failed', error);
      return false;
    }
  }

  async listProducts(): Promise<Product[]> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/list_products`,
        qs.stringify({ /* TODO: filters */ }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'idToken': idToken
          },
          // Prevent axios from following redirects
          maxRedirects: 0
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Request successful');
        console.log(response.data);
        return response.data;
      } else {
        console.error('Request failed');
        return [];
      }
    } catch (error) {
      console.error('Request failed.', error);
      return [];
    }
  }

  async addProduct(product: Product): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/add_product`,
        product,
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log('Product added successfully');
        return true;
      } else {
        console.error('Failed to add product');
        return false;
      }
    } catch (error) {
      console.error('Error adding product:', error);
      return false;
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/delete_product/${productId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken
          },
          maxRedirects: 0
        }
      );

      if (response.status === 200) {
        console.log('Product deleted successfully');
        return true;
      } else {
        console.error('Failed to delete product');
        return false;
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      return false;
    }
  }

  async wasteProduct(productId: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/waste_product/${productId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      if (response.status === 200) {
        console.log('Product marked as wasted successfully');
        return true;
      } else {
        console.error('Failed to mark product as wasted', response.data.error || response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Failed to mark product as wasted', error);
      return false;
    }
  }

  async updateProduct(product: Product): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/update_product/${product.product_id}`,
        product,
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken
          },
          maxRedirects: 0
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Product updated successfully');
        return true;
      } else {
        console.error('Failed to update product');
        return false;
      }
    } catch (error) {
      console.error('Failed to update product', error);
      return false;
    }
  }

  static async generateRecipe(ingredients: string): Promise<string> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/generate-recipe`,
        { ingredients },
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken
          },
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Recipe generated successfully');
        return response.data.recipe;
      } else {
        console.error('Failed to generate recipe');
        return '';
      }
    } catch (error) {
      console.error('Failed to generate recipe', error);
      return '';
    }
  }

  static async generateRecipeFromDatabase(): Promise<string> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.get(
        `${BASE_URL}/generate_recipe_from_database`,
        {
          headers: {
            'idToken': idToken,
          },
        }
      );

      return response.status >= 200 && response.status < 300 ? response.data.recipe_suggestion : '';
    } catch (error) {
      console.error('Failed to generate recipe from database', error);
      return '';
    }
  }

  async addLocation(location: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/add_location`,
        { location },
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error adding location:', error);
      return false;
    }
  }

  async deleteLocation(location: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/delete_location`,
        { location },
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error deleting location:', error);
      return false;
    }
  }

  async addCategory(category: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/add_category`,
        { category },
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error adding category:', error);
      return false;
    }
  }

  async deleteCategory(category: string): Promise<boolean> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.post(
        `${BASE_URL}/delete_category`,
        { category },
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': idToken,
          },
          maxRedirects: 0,
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  async getLocationsAndCategories(): Promise<{ locations: string[], categories: string[] }> {
    try {
      const idToken = await AsyncStorage.getItem('idToken');
      if (!idToken) throw new Error('idToken not found');

      const response = await axios.get(
        `${BASE_URL}/get_locations_categories`,
        {
          headers: {
            'idToken': idToken,
          },
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Failed to fetch locations and categories');
      }
    } catch (error) {
      console.error('Error fetching locations and categories:', error);
      return { locations: [], categories: [] };
    }
  }
}

export default Requests;
export { BASE_URL };
