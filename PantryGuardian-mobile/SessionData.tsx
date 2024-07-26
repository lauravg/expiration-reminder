import * as SecureStore from 'expo-secure-store';


/** Stores important session data securely. */
export class SessionData {

  public userEmail = ""
  public userDisplayName = ""
  public userPhotoUrl = ""
  public idToken = ""
  public refreshToken = ""

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