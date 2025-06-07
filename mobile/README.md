# Pantry Guardian - MOBILE APP

This is the react native mobile app.

## Set up

To run the React Native Expo app, you need to have nvm (Node Version Manager) and Expo CLI installed.

1. **Install nvm (Node Version Manager):**
   - Install nvm by running:
     ```bash
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
     ```
     **Note:** *Check on the NVM [release page](https://github.com/nvm-sh/nvm/releases) to see which version is the latest.*
   - Close and reopen your terminal, then verify the installation:
     ```bash
     nvm --version
     ```
   - Install and use the recommended Node.js version:
     ```bash
     nvm install 20
     nvm use 20
     ```
   - Verify Node.js and npm are installed:
     ```bash
     node --version
     npm --version
     ```

2. **Install Expo CLI globally:**
   ```
   npm install -g expo-cli
   ```

3. **Install project dependencies:**
   - In the `/mobile` directory, run:
     ```
     npm install
     ```

You are now ready to run the app using Expo.

## Development
To start a development server to run the app on your phone, run `npx expo start`