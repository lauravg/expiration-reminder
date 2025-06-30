import AsyncStorage from "@react-native-async-storage/async-storage";
import Requests from "./Requests";

export interface Household {
  id: string;
  name: string;
  owner: boolean;
  active: boolean;
  participant_emails: string[];
  display_names: string[];
}

export class HouseholdManager {
  requests: Requests;
  private static householdsCache: Household[] | null = null;

  constructor(requests: Requests) {
    this.requests = requests;
  }

  async getHouseholds(): Promise<Household[]> {
    if (HouseholdManager.householdsCache !== null) {
      return HouseholdManager.householdsCache;
    }

    const households = await this.requests.listHouseholds();
    HouseholdManager.householdsCache = households;
    return households;
  }

  // Call this to ensure we update the cache on use changes and load
  // the current household information if it needs updating.
  static async invalidate() {
    await AsyncStorage.setItem("active-household", "");
    HouseholdManager.householdsCache = null;
  }

  async getActiveHouseholdId(): Promise<string> {
    // First try to get the stored active household
    const activeId = await AsyncStorage.getItem("active-household");
    if (activeId && activeId !== "") {
      // Verify that the stored household still exists
      const households = await this.getHouseholds();
      const householdExists = households.some(h => h.id === activeId);
      if (householdExists) {
        return activeId;
      }
      // If the stored household doesn't exist anymore, we'll fall through to try other options
    }

    console.log("No active household set or stored household no longer exists. Will try to get last active household...");

    // Try to get the last active household from the server
    try {
      const lastActiveHousehold = await this.requests.getLastActiveHousehold();
      if (lastActiveHousehold && lastActiveHousehold !== "") {
        // Verify the household still exists and user has access
        const households = await this.getHouseholds();
        const householdExists = households.some(h => h.id === lastActiveHousehold);
        if (householdExists) {
          await this.setActiveHousehold(lastActiveHousehold);
          return lastActiveHousehold;
        }
      }
    } catch (error) {
      console.log("Failed to get last active household:", error);
    }

    console.log("No last active household found. Will determine one...");

    // If we get here, we need to select a new household
    const households = await this.getHouseholds();
    if (households.length === 0) {
      throw new Error("No households available");
    }

    // Try to find a household where the user is the owner
    for (let i = 0; i < households.length; ++i) {
      if (households[i].owner) {
        this.setActiveHousehold(households[i].id);
        return households[i].id;
      }
    }

    // If no owned households, use the first one
    this.setActiveHousehold(households[0].id);
    return households[0].id;
  }

  async setActiveHousehold(id: string) {
    // Update local storage
    await AsyncStorage.setItem("active-household", id);

    // Update server-side active household
    try {
      await this.requests.setActiveHousehold(id);
    } catch (error) {
      console.error("Failed to update server-side active household:", error);
    }
  }
}