import axios from 'axios';
import qs from 'qs';
import { Product } from './Product';

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

  constructor() {}

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
            // Prevent axios from following redirects
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


  // TODO: Add filters
  // TODO: Handle token needing refreshing.
  async listProducts(): Promise<Product[]> {
    try {
      const response = await axios.post(
        `${BASE_URL}/list_products`,
        qs.stringify({ /* TODO: filters */}),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'idToken': Requests.idToken
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
      console.error('Request failed.');
      return [];
    }
  }

  async addProduct(product: Product): Promise<boolean> {
    try {
      const response = await axios.post(
        `${BASE_URL}/add_product`,
        product,
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': Requests.idToken,
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
    console.log('Sending delete request with token:', Requests.idToken);
    try {
      const response = await axios.post(
        `${BASE_URL}/delete_product/${productId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': Requests.idToken
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
      const response = await axios.post(
        `${BASE_URL}/waste_product/${productId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': Requests.idToken,
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
      const response = await axios.post(
        `${BASE_URL}/update_product/${product.product_id}`,
        product,
        {
          headers: {
            'Content-Type': 'application/json',
            'idToken': Requests.idToken
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

  async generateRecipe(ingredients: string): Promise<string> {
    try {
      const response = await axios.post(
        `${BASE_URL}/generate-recipe`,
        { ingredients },
        {
          headers: {
            'Content-Type': 'application/json',
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
}

export default Requests;