import axios, { AxiosError, AxiosResponse } from 'axios';
import qs from 'qs';
import { Product } from './Product';
import { SessionData } from './SessionData';
import { Household, HouseholdManager } from './HouseholdManager';

// const BASE_URL = "https://expiration-reminder-105128604631.us-central1.run.app/";
// const BASE_URL = "http://127.0.0.1:8081";
const BASE_URL = "http://192.168.1.43:5050";

class Requests {
  private sessionData = new SessionData();
  // private householdManager: HouseholdManager;

  // constructor(householdManager: HouseholdManager) {
  //   this.householdManager = householdManager;
  // }

  // Helper method to set session data consistently
  private setSessionData(data: any): void {
    this.sessionData.setIdToken(data.it);
    this.sessionData.setRefreshToken(data.rt);
    this.sessionData.setUserDisplayName(data.display_name || "");
    this.sessionData.setUserEmail(data.user_email || "");
    this.sessionData.setUserPhotoUrl(data.user_photo_url || "");
  }


  // Logs in the user and sets session data
  async handleLogin(email: string, password: string): Promise<boolean> {
    try {
      const response = await this._make_request("", "auth", { email, password }, false);
      if (response.status >= 200 && response.status < 300) {
        this.setSessionData(response.data); // Use helper method
        console.info("Login successful");
        return true;
      }
      throw new Error(`Login failed. Return code was ${response.status}`);
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Login failed: " + error);
    }
  }

  async logout(): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, "logout");
      if (response.status === 200 && response.data.success) {
        console.log("Logout successful on server.");
        return true;
      } else {
        console.error("Failed to log out on server.");
        return false;
      }
    } catch (error) {
      console.error("Error during logout:", error);
      return false;
    }
  }

  // Refreshes the session token
  async handleRefresh(): Promise<boolean> {
    try {
      const refresh_token = this.sessionData.refreshToken;
      if (!refresh_token) {
        throw new Error("Refresh token is missing. Cannot refresh login.");
      }

      const response = await this._make_request("", "auth", { refresh_token }, false);

      if (response.status >= 200 && response.status < 300) {
        this.setSessionData(response.data); // Use helper method
        console.info("Login successful via refresh");
        return true;
      } else {
        throw new Error(`Refresh failed. Return code was ${response.status}`);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      return false;
    }
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
        // console.log(response.data);
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

  async addProduct(product: Product, householdId: string): Promise<boolean> {
    console.log(">>>> Adding product:", product, householdId);
    try {
      const response = await this._make_request(this.sessionData.idToken, 'add_product', {product, householdId});
      if (response.status === 200 && response.data.success) {
        console.log('Product added successfully');
        return true;
      } else {
        console.error('Failed to add product!');
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
    const idToken = this.sessionData.idToken;

    if (!idToken) {
      console.error('idToken is missing! User might not be logged in.');
      return { locations: [], categories: [] };
    }

    try {
      const response = await this._make_request(idToken, 'get_locations_categories');
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

  async getNotificationSettings(): Promise<{ notificationsEnabled: boolean, daysBefore: number, hour: number, minute: number }> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_notification_settings');
      if (response.status === 200) {
        return {
          notificationsEnabled: response.data.notificationsEnabled,
          daysBefore: response.data.daysBefore,
          hour: response.data.hour,
          minute: response.data.minute,
        };
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

  async saveNotificationPushToken(obj: any): Promise<boolean> {
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

  async getBarcodeData(barcode: string): Promise<{ name: string } | null> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_barcode', { barcode });
      if (response.status === 200 && response.data) {
        return response.data;
      } else {
        console.error('Barcode not found in the database');
        return null;
      }
    } catch (error) {
      console.error('Error fetching barcode data:', error);
      return null;
    }
  }


  async addBarcodeToDatabase(barcodeData: { barcode: string; name: string }): Promise<boolean> {
    try {
      console.log("Attempting to add barcode:", barcodeData);

      if (!barcodeData.barcode || !barcodeData.name) {
        console.error("Barcode or name is missing.");
        return false;
      }

      const response = await this._make_request(this.sessionData.idToken, "add_barcode", barcodeData);
      if (response.status === 200) {
        console.log("Barcode added successfully");
        return true;
      } else {
        console.error("Failed to add barcode. Response status:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Failed to add barcode to database:", error);
      return false;
    }
  }

  async saveViewSettings(settings: {
    viewMode: string,
    sortBy: string,
    hideExpired: boolean,
    activeFilter: string
  }): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'save_view_settings', settings);
      return response.status === 200;
    } catch (error) {
      console.error('Error saving view settings:', error);
      return false;
    }
  }

  async getViewSettings(): Promise<{
    viewMode: string,
    sortBy: string,
    hideExpired: boolean,
    activeFilter: string
  } | null> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_view_settings', {});
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching view settings:', error);
      return null;
    }
  }

  private async _make_request(
    idToken: string | undefined,
    path: string,
    data: any = {},
    retry_if_auth_expired = true
  ): Promise<AxiosResponse> {
    console.log(`make_request (${path})`);

    const authOrRegister = path === "auth" || path === "register";
    const contentType = authOrRegister ? 'application/x-www-form-urlencoded' : 'application/json';

    if (!idToken && !authOrRegister) {
      throw new Error('idToken is missing! Ensure you are logged in.');
    }

    const headers = {
      'Content-Type': contentType,
      ...(idToken ? { 'idToken': idToken } : {}),
    };

    try {
      const response = await axios.post(
        `${BASE_URL}/${path}`,
        authOrRegister ? qs.stringify(data) : data,
        { headers, maxRedirects: 0 }
      );
      return response;
    } catch (err: any) {
      if (err?.isAxiosError) {
        const axiosError = err as AxiosError;
        console.error(`Error making request, response code: ${axiosError.response?.status}`);
        if (axiosError.response?.status === 401 && retry_if_auth_expired) {
          console.log("Refreshing idToken...");
          const refreshed = await this.handleRefresh();
          if (refreshed) {
            const newIdToken = this.sessionData.idToken;
            return this._make_request(newIdToken, path, data, false);
          }
        }

        if (axiosError.response != null) {
          console.error("Request failed:", (axiosError.response.data as any).error);
          throw new Error("Request failed: " + (axiosError.response.data as any).error);
        }
      }
      throw new Error("Uncaught error: " + err);
    }
  }
}

export default Requests;
export { BASE_URL };
