import axios from 'axios';
import qs from 'qs';
import { Product } from './Product'

// interface Authenticator {
//   register?: (email: string, password: string) => Promise<boolean>;
//   login?: (email: string, password: string) => Promise<boolean>;
//   logout?: () => Promise<any>;
// }

const BASE_URL = "http://127.0.0.1:5000"

class Requests {
  // TODO: These should be stored in secure storage to persist.
  static refresh_token = "";
  static idToken = "";

  constructor() {
  }

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
    return true
  }

  // TODO: Add filters
  // TODO: Handle token needing refreshing.
  async listProducts(): Promise<Product[]> {
    try {
      const response = await axios.post(
        `${BASE_URL}/list_products`,
        qs.stringify({ /* TODO: filters */}),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded',
            'idToken': Requests.idToken
          },
          maxRedirects: 0 // Prevent axios from following redirects
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Request successful');
        console.log(response.data);
        return response.data;
        // return [
        //   { product_name: 'Product 11', expiration_date: '2024-05-01', location: 'Fridge', product_id: 1, expired: false, creation_date: '2024-04-20', wasted: false },
        //   { product_name: 'Product 22', expiration_date: '2024-05-11', location: 'Pantry', product_id: 2, expired: true, creation_date: '2024-04-21', wasted: false },
        //   { product_name: 'Product 33', expiration_date: '2024-05-21', location: 'Fridge', product_id: 3, expired: true, creation_date: '2024-04-22', wasted: false },
        //   { product_name: 'Product 44', expiration_date: '2024-06-10', location: 'Pantry', product_id: 4, expired: true, creation_date: '2024-04-23', wasted: false },
        //   { product_name: 'Product 55', expiration_date: '2024-07-10', location: 'Pantry', product_id: 5, expired: true, creation_date: '2024-04-24', wasted: true, wasted_date: '2024-04-25' },
        //   { product_name: 'Product 66', expiration_date: '2024-05-11', location: 'Pantry', product_id: 6, expired: true, creation_date: '2024-04-21', wasted: true, wasted_date: '2024-04-26' },
        // ];
      } else {
        console.error('Request failed');
        return [];
      }
    } catch (error) {
      console.error('Login failed.');
      return [];
    }
  }
}

export default Requests