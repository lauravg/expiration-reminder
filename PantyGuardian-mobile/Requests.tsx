import axios from 'axios';
import qs from 'qs';

// interface Authenticator {
//   register?: (email: string, password: string) => Promise<boolean>;
//   login?: (email: string, password: string) => Promise<boolean>;
//   logout?: () => Promise<any>;
// }

const BASE_URL = "http://127.0.0.1:5000"

class Requests {
  // TODO: These should be stored in secure storage to persist.
  refresh_token = "";
  idToken = "";

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
        this.refresh_token = response.data.rt;
        this.idToken = response.data.it;
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
}

export default Requests