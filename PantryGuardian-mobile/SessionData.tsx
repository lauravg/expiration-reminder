import * as SecureStore from 'expo-secure-store';


/** Stores important session data securely. */
export class SessionData {

  public userEmail = ""
  public userDisplayName = ""
  public userPhotoUrl = ""
  public idToken = ""
  public refreshToken = ""
  private static INVITATION_ID_KEY = "pendingInvitationId"

  constructor() {
    this.userEmail = this.getValue("userEmail")
    this.userDisplayName = this.getValue("userDisplayName")
    this.userPhotoUrl = this.getValue("userPhotoUrl")
    this.idToken = this.getValue("idToken")
    this.refreshToken = this.getValue("refreshToken")
  }

  public eraseAllData() {
    this.setUserEmail("");
    this.setUserDisplayName("");
    this.setUserPhotoUrl("");
    this.setIdToken("");
    this.setRefreshToken("");
    this.clearStoredInvitationId();

    this.userEmail = ""
    this.userDisplayName = ""
    this.userPhotoUrl = ""
    this.idToken = ""
    this.refreshToken = ""
  }

  public setUserEmail(email: string) {
    this.userEmail = this.setValue(email, this.userEmail, "userEmail");
  }
  public setUserDisplayName(displayName: string) {
    this.userDisplayName = this.setValue(displayName, this.userDisplayName, "userDisplayName");
  }
  public setUserPhotoUrl(photoUrl: string) {
    this.userPhotoUrl = this.setValue(photoUrl, this.userPhotoUrl, "userPhotoUrl");
  }
  public setIdToken(idToken: string) {
    this.idToken = this.setValue(idToken, this.idToken, "idToken");
  }
  public setRefreshToken(refreshToken: string) {
    this.refreshToken = this.setValue(refreshToken, this.refreshToken, "refreshToken");
  }

  // Store invitation ID temporarily until user logs in
  public async storeInvitationId(invitationId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SessionData.INVITATION_ID_KEY, invitationId);
      console.log("Stored invitation ID:", invitationId);
    } catch (error) {
      console.error("Error storing invitation ID:", error);
    }
  }

  // Get the stored invitation ID if any
  public async getStoredInvitationId(): Promise<string | null> {
    try {
      const invitationId = await SecureStore.getItemAsync(SessionData.INVITATION_ID_KEY);
      return invitationId;
    } catch (error) {
      console.error("Error retrieving invitation ID:", error);
      return null;
    }
  }

  // Clear the stored invitation ID after it's been processed
  public async clearStoredInvitationId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SessionData.INVITATION_ID_KEY);
      console.log("Cleared stored invitation ID");
    } catch (error) {
      console.error("Error clearing invitation ID:", error);
    }
  }

  private getValue(key: string): string {
    const result = SecureStore.getItem(key);
    if (!result) return ""
    return result;
  }

  private setValue(newValue: string, currentValue: string, key: string): string {
    try {
      SecureStore.setItem(key, newValue);
      return newValue;
    } catch (error) {
      console.error(`Error persisting ${key}:`, error);
      return currentValue
    }
  }
}