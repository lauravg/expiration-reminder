import axios, { AxiosError, AxiosResponse } from 'axios';
import qs from 'qs';
import { Product, Barcode } from './Product';
import { SessionData } from './SessionData';
import { Household, HouseholdManager } from './HouseholdManager';

const BASE_URL = "https://expiration-reminder-105128604631.us-central1.run.app";
// const BASE_URL = "http://127.0.0.1:5050";
// const BASE_URL = "http://192.168.1.50:5050";

interface ProductSuggestion {
  name: string;
  barcode: string;
}

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
        console.log(`Listing products successful. Got ${response.data.length} products.`);
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

  async generateRecipeFromDatabase(householdId: string): Promise<string> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'generate_recipe_from_database', { householdId }  );
      return response.status >= 200 && response.status < 300 ? response.data.recipe_suggestion : '';
    } catch (error) {
      console.error('Failed to generate recipe from database', error);
      return '';
    }
  }

  async addLocation(location: string, householdId: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'add_location', { location, householdId });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to add location:', error);
      return false;
    }
  }

  async deleteLocation(location: string, householdId: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'delete_location', { location, householdId });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to delete location:', error);
      return false;
    }
  }

  async addCategory(category: string, householdId: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'add_category', { category, householdId });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to add category:', error);
      return false;
    }
  }

  async deleteCategory(category: string, householdId: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'delete_category', { category, householdId });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to delete category:', error);
      return false;
    }
  }

  async getLocationsAndCategories(householdId: string): Promise<{ locations: string[], categories: string[] }> {
    const idToken = this.sessionData.idToken;

    if (!idToken) {
      console.error('idToken is missing! User might not be logged in.');
      return { locations: [], categories: [] };
    }

    try {
      const response = await this._make_request(idToken, 'get_locations_categories', { householdId });
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

  async getBarcodeData(barcode: string, householdId: string): Promise<Barcode | null> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_barcode', { barcode, householdId });
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


  async addBarcodeToDatabase(barcode: string, name: string, householdId: string): Promise<boolean> {
    try {
      if (!barcode) {
        console.error("Barcode is missing.");
        return false;
      }
      if (!name) {
        console.error("Name is missing.");
        return false;
      }
      if (!householdId) {
        console.error("Household ID is missing.");
        return false;
      }

      const response = await this._make_request(this.sessionData.idToken, "add_barcode", {barcode, name, householdId});
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
    sortByProductList: string;
    hideExpiredProductList: boolean;
    activeFilterProductList: string;
    viewModeProductList: 'grid' | 'list' | 'simple';
    sortByWastedList: string;
    hideExpiredWastedList: boolean;
    activeFilterWastedList: string;
    viewModeWastedList: 'grid' | 'list' | 'simple';
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
    sortByProductList: string;
    hideExpiredProductList: boolean;
    activeFilterProductList: string;
    viewModeProductList: 'grid' | 'list' | 'simple';
    sortByWastedList: string;
    hideExpiredWastedList: boolean;
    activeFilterWastedList: string;
    viewModeWastedList: 'grid' | 'list' | 'simple';
  } | null> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_view_settings', {});
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting view settings:', error);
      return null;
    }
  }

  async searchProducts(query: string, householdId: string): Promise<ProductSuggestion[]> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        'search_products',
        { query, householdId }
      );

      if (response.status === 200) {
        return response.data.suggestions;
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async uploadProductImage(imageUri: string): Promise<string | null> {
    try {
      // Create form data
      const formData = new FormData();
      
      // Get the file extension from the URI
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
      
      formData.append('image', {
        uri: imageUri,
        type: mimeType,
        name: `product_image.${fileExtension}`
      } as any);

      const response = await this._make_request(
        this.sessionData.idToken,
        'upload_product_image',
        formData,
        true // isFormData
      );

      if (response.status === 200 && response.data.image_url) {
        return response.data.image_url;
      } else {
        console.error('Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async deleteAccount(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting to delete account');
      const response = await this._make_request(
        this.sessionData.idToken,
        'delete_account',
        { password }
      );

      if (response.status === 200) {
        console.log('Account deleted successfully');
        return { success: true };
      } else {
        const error = response.data?.error || 'Failed to delete account';
        console.error('Delete account failed:', error);
        return { success: false, error };
      }
    } catch (error) {
      console.error('Delete account request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete account'
      };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this._make_request("", "reset_password", { email }, false);
      if (response.status >= 200 && response.status < 300) {
        return { success: true };
      } else {
        return { success: false, error: response.data.error || 'Failed to send reset email' };
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('Network Error')) {
          return { 
            success: false, 
            error: 'Unable to connect to the server. Please check your internet connection and try again.' 
          };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to send reset email' };
    }
  }

  async createHousehold(name: string): Promise<boolean> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        '/create_household',
        { name }
      );
      return response.data.success;
    } catch (error) {
      console.error('Error creating household:', error);
      return false;
    }
  }

  async deleteHousehold(id: string): Promise<boolean> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        'delete_household',
        { id }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting household:', error);
      return false;
    }
  }

  async getLastActiveHousehold(): Promise<string | null> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'get_last_active_household');
      if (response.status >= 200 && response.status < 300) {
        return response.data.household_id || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get last active household:', error);
      return null;
    }
  }

  async setActiveHousehold(householdId: string): Promise<boolean> {
    try {
      const response = await this._make_request(this.sessionData.idToken, 'set_active_household', { household_id: householdId });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Failed to set active household:', error);
      return false;
    }
  }

  async updateProfile(displayName: string): Promise<boolean> {
    try {
      console.log('Updating profile with display name:', displayName);
      const response = await this._make_request(
        this.sessionData.idToken,
        'update_profile',
        { display_name: displayName }
      );
      
      if (response.status === 200 && response.data.success) {
        // Update the session data locally
        this.sessionData.setUserDisplayName(displayName);
        console.log('Profile updated successfully');
        return true;
      } else {
        console.error('Failed to update profile:', response.data?.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  // Invite a user to join a household
  async inviteToHousehold(householdId: string, email: string): Promise<{success: boolean, error?: string, email_sent?: boolean}> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        'invite_to_household',
        { household_id: householdId, email: email }
      );
      
      if (response.status === 200 && response.data.success) {
        console.log('Household invitation sent successfully');
        return { 
          success: true, 
          email_sent: response.data.email_sent
        };
      } else {
        console.error('Failed to send household invitation:', response.data?.error || 'Unknown error');
        return { 
          success: false, 
          error: response.data?.error || 'Failed to send invitation'
        };
      }
    } catch (error: any) {
      console.error('Error sending household invitation:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  // Get pending invitations for the current user
  async getPendingInvitations(): Promise<any[]> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        'get_pending_invitations',
        {}
      );
      
      if (response.status === 200 && response.data.success) {
        console.log('Retrieved pending invitations:', response.data.invitations.length);
        return response.data.invitations || [];
      } else {
        console.error('Failed to get pending invitations:', response.data?.error || 'Unknown error');
        return [];
      }
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  // Accept a household invitation
  async acceptInvitation(invitationId: string): Promise<{success: boolean, error?: string, household_id?: string}> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        `accept_invitation/${invitationId}`,
        {}
      );
      
      if (response.status === 200 && response.data.success) {
        console.log('Invitation accepted successfully');
        return { 
          success: true, 
          household_id: response.data.household_id
        };
      } else {
        console.error('Failed to accept invitation:', response.data?.error || 'Unknown error');
        return { 
          success: false, 
          error: response.data?.error || 'Failed to accept invitation'
        };
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  // Reject a household invitation
  async rejectInvitation(invitationId: string): Promise<{success: boolean, error?: string}> {
    try {
      const response = await this._make_request(
        this.sessionData.idToken,
        `reject_invitation/${invitationId}`,
        {}
      );
      
      if (response.status === 200 && response.data.success) {
        console.log('Invitation rejected successfully');
        return { success: true };
      } else {
        console.error('Failed to reject invitation:', response.data?.error || 'Unknown error');
        return { 
          success: false, 
          error: response.data?.error || 'Failed to reject invitation'
        };
      }
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  private async _make_request(
    idToken: string | undefined,
    path: string,
    data: any = {},
    isFormData = false,
    retry_if_auth_expired = true
  ): Promise<AxiosResponse> {
    console.log(`make_request (${path})`);

    const authOrRegister = path === "auth" || path === "register";
    const resetPassword = path === "reset_password";
    let contentType = authOrRegister ? 'application/x-www-form-urlencoded' : 'application/json';
    
    if (isFormData) {
      contentType = 'multipart/form-data';
    }

    if (!idToken && !authOrRegister && !resetPassword) {
      throw new Error('idToken is missing! Ensure you are logged in.');
    }

    const headers = {
      'Content-Type': contentType,
      ...(idToken ? { 'idToken': idToken } : {}),
    };

    try {
      let requestData = data;
      if (authOrRegister && !isFormData) {
        requestData = qs.stringify(data);
      }

      const response = await axios.post(
        `${BASE_URL}/${path}`,
        requestData,
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
            return this._make_request(newIdToken, path, data, isFormData, false);
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
