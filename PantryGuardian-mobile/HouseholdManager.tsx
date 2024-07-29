import AsyncStorage from "@react-native-async-storage/async-storage";
import Requests from "./Requests";

export interface Household {
  id: string;
  name: string;
  owner: boolean;
  active: boolean;
  participant_emails: string[];
}

export class HouseholdManager {
  requests: Requests;
  constructor(requests: Requests) {
    this.requests = requests;
  }

  async getHouseholds(): Promise<Household[]> {
    var activeId = await this.getActiveHouseholdId();
    const households = await this.requests.listHouseholds();
    
    for (let i = 0; i < households.length; ++i) {
      households[i].active = households[i].id == activeId;
    }
    return households;
  }

  async getActiveHouseholdId(): Promise<string> {
    const activeId = await AsyncStorage.getItem("active-household");
    if (activeId) return activeId;

    console.log("No active household set. Will determine one...");

    // Check if an active household is set, if not, choose the first owned household.
    const households = await this.requests.listHouseholds();
    for (let i = 0; i < households.length; ++i) {
      if (households[i].owner) {
        this.setActiveHousehold(households[i].id);
        return households[i].id;
      }
    }

    // Fallback, set the first household.
    this.setActiveHousehold(households[0].id);
    return households[0].id;
  }

  async setActiveHousehold(id: string) {
    await AsyncStorage.setItem("active-household", id);
  }
}