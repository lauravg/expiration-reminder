import axios from 'axios';
import qs from 'qs';
import { Product } from './Product';

// interface Authenticator {
//   register?: (email: string, password: string) => Promise<boolean>;
//   login?: (email: string, password: string) => Promise<boolean>;
//   logout?: () => Promise<any>;
// }

const BASE_URL = "http://127.0.0.1:5000";

class Requests {
  // TODO: These should be stored in secure storage to persist.
  static refresh_token = "";
  static idToken = "";

  constructor() {}

  async handleLogin(email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${BASE_URL}/auth`,
        qs.stringify({ email, password }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0 // Prevent axios from following redirects
        }
      );

      if (response.status >= 200 && response.status < 300) {
        Requests.refresh_token = response.data.rt;
        Requests.idToken = response.data.it;
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
          maxRedirects: 0 // Prevent axios from following redirects
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

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${BASE_URL}/delete_product/${productId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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
            'Content-Type': 'application/x-www-form-urlencoded',
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
}

export default Requests;
