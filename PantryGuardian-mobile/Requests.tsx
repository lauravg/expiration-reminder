import axios, { AxiosError, AxiosResponse } from 'axios';
import qs from 'qs';
import { Product } from './Product';
import { SessionData } from './SessionData'
import { Household } from './HouseholdManager';

const BASE_URL = "https://expiration-reminder-105128604631.us-central1.run.app/";
// const BASE_URL = "http://127.0.0.1:8081";

class Requests {
  private sessionData = new SessionData()

  constructor() { 
  }

  async handleLogin(email: string, password: string): Promise<boolean> {
    try {
      const response = await this._make_request("", "auth", {email, password}, false);
      if (response.status >= 200 && response.status < 300) {
        // Persist the data we are gettin from the auth request in a secure location.
        this.sessionData.setRefreshToken(response.data.rt);
        this.sessionData.setIdToken(response.data.it);
        this.sessionData.setUserDisplayName(response.data.display_name);
        this.sessionData.setUserEmail(response.data.user_email);
        this.sessionData.setUserPhotoUrl(response.data.user_photo_url);
      } else {
        throw new Error(`Login failed. Return code was ${response.status}`);
      }
    } catch (error) {
      throw new Error('Login failed: ' + error);
    }
    console.info('Login successful (user/pass)');
    return true;
  }

  async handleRefresh(): Promise<boolean> {
    try {
      const refresh_token = this.sessionData.refreshToken;
      const response = await this._make_request("", "auth", {refresh_token}, false);

      if (response.status >= 200 && response.status < 300) {
        // Persist the data we are getting from the auth request in a secure location.
        this.sessionData.setRefreshToken(response.data.rt);
        this.sessionData.setIdToken(response.data.it);
        this.sessionData.setUserDisplayName(response.data.display_name);
        this.sessionData.setUserEmail(response.data.user_email);
        this.sessionData.setUserPhotoUrl(response.data.user_photo_url);
      } else {
        throw new Error(`Login failed. Return code was ${response.status}`);
      }
    } catch (error) {
      throw new Error('Login failed: ' + error);
    }
    console.info('Login successful via refresh');
    return true;
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    try {
      const response = await this._make_request("", "register", { name, email, password }, false);

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

  async listProducts(householdId: string): Promise<Product[]> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'list_products', { householdId });

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
      const response = await this._make_request(this.sessionData.idToken, 'add_product', product);
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
      const response = await this._make_request(this.sessionData.idToken, `delete_product/${productId}`, {});
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
      const response = await this._make_request(this.sessionData.idToken, `waste_product/${productId}`, {});
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
      const response = await this._make_request(this.sessionData.idToken, `update_product/${product.product_id}`, product);
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
      const response = await this._make_request(this.sessionData.idToken, 'generate-recipe', { ingredients });
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

  async generateRecipeFromDatabase(): Promise<string> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'generate_recipe_from_database');
      return response.status >= 200 && response.status < 300 ? response.data.recipe_suggestion : '';
    } catch (error) {
      console.error('Failed to generate recipe from database', error);
      return '';
    }
  }

  async addLocation(location: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'add_location', { location });
      return response.status === 200;
    } catch (error) {
      console.error('Error adding location:', error);
      return false;
    }
  }

  async deleteLocation(location: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'delete_location', { location });
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting location:', error);
      return false;
    }
  }

  async addCategory(category: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'add_category', { category });
      return response.status === 200;
    } catch (error) {
      console.error('Error adding category:', error);
      return false;
    }
  }

  async deleteCategory(category: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'delete_category', { category });
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  async getLocationsAndCategories(): Promise<{ locations: string[], categories: string[] }> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_locations_categories');
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

  async getNotificationSettings(): Promise<{ notificationsEnabled:boolean, daysBefore: number, hour: number, minute: number }> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_notification_settings');
      if (response.status === 200) {
        return {
          notificationsEnabled: response.data.notificationsEnabled,
          daysBefore: response.data.daysBefore,
          hour: response.data.hour,
          minute: response.data.minute,
        }
      } else {
        throw new Error('Failed to fetch notification settings');
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return { notificationsEnabled: false, daysBefore: 0, hour: 0, minute: 0 };
    }
  }

  async saveNotificationSettings(settings: any): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'save_notification_settings', settings);
      if (response.status === 200) {
        return true;
      } else {
        console.error('Error fetching notification settings. (Server error)');
        return false;
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return false;
    }
  }

  async saveNotificationPushToken( obj: any ): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'save_push_token', obj);
      if (response.status === 200) {
        return true;
      } else {
        console.error('Error saving push token. (Server error)');
        return false;
      }
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  }

  async listHouseholds(): Promise<Household[]> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'list_households');

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


  async _make_request(idToken: string, path: string, data: any = {}, retry_if_auth_expired = true): Promise<AxiosResponse> {
    console.log(`make_request (${path})`);

    const authOrRegister = path == "auth" || path == "register";
    const contentType = authOrRegister ? 'application/x-www-form-urlencoded' : 'application/json';

    if (!idToken && !authOrRegister) throw new Error('idToken not found');
    const responsePromise = axios.post(
      `${BASE_URL}/${path}`,
      authOrRegister ? qs.stringify(data) : data,
      {
        headers: {
          'Content-Type': contentType,
          'idToken': idToken
        },
        // Prevent axios from following redirects
        maxRedirects: 0
      }
    );
    try {
      const response = await responsePromise;

      // If we got here, it means no error was thrown, which means we got
      // a good response status code. Error codes will be handled in the catch block.
      return new Promise((resolve, reject) => {
        resolve(response);
      });
    } catch (err: any) {
      if (err?.isAxiosError) {
        const axiosError = err as AxiosError;
        console.error(`Error making request, got response code: ${axiosError.response?.status}`);
        // If we had an auth error, refresh our credentials and try again.
        if (axiosError.response?.status == 401 && retry_if_auth_expired) {
          await this.handleRefresh();
          console.log("Sending request a second time after refreshing credentials.");
          return this._make_request(this.sessionData.idToken, path, data, false);
        }
        // TODO: Logout if we got a 401 but no refresh worked.
      }
      console.error("Request failed:" + err);
      return new Promise((resolve, reject) => {
        reject("Request failed: " + err);
      });
    }
  }
}

export default Requests;
export { BASE_URL };
