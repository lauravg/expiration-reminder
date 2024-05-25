import { Platform, StyleSheet } from 'react-native';
import { colors, theme } from './theme';

const GlobalStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: colors.primaryBackground,
    ...(Platform.OS === 'web' && {
      width: '80%',
      justifyContent: 'center',
      alignSelf: 'center',
    }),
  },

  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },

  // Login and Registration
  loginContainer: {
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' && {
      width: 600,
      alignSelf: 'center',
    }),
  },

  loginLogo: {
    borderRadius: 100,
    width: 250,
    height: 250,
    marginBottom: 40,
    alignSelf: 'center',
  },

  registerLink: {
    textAlign: 'center',
    marginTop: 20,
    color: colors.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerLeft: {
    marginTop: 10,
    flexDirection: 'column',
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },


  // // Links
  // link: {
  //   flex: 1,
  //   flexDirection: 'row',
  //   justifyContent: 'space-evenly',
  //   // marginBottom: 20,
  // },

  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },


  // Search
  searchInput: {
    marginVertical: 10,
  },


  // Filter
  filterContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },

  filterButton: {
    paddingHorizontal: 10,
  },

  filterText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.secondary,
  },

  activeFilterText: {
    fontSize: 16,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // Modal
  modalContent: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    ...(Platform.OS === 'web' && {
      width: 600,
      alignSelf: 'center',
    }),
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  picker: {
    flex: 1,
    marginRight: 10,
  },

  detailValue: {
    flex: 1,
  },

  
  // Button
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },


  // Input
  input: {
    marginBottom: 10,
  },

  // Product Details (Modal)
  productDetails: {
    flexDirection: 'column',
    marginBottom: 5,
  },

  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  detailLabel: {
    fontWeight: 'bold',
    marginRight: 10,
  },


  // Product Container
  productList: {
    ...(Platform.OS === 'web' && {
      width: '80%',
      height: 600,
      alignSelf: 'center',
      borderRadius: 10,
      boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
      padding: 60,
    }),
  },

  productContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 10,
    borderColor: '#ddd',
    backgroundColor: colors.background,
  },

  // Product Information
  productInfo: {
    width: '65%',
    flexDirection: 'column',
  },

  productName: {
    fontSize: 16,
    flexWrap: 'wrap',
    fontWeight: '500',
    width: '100%',
  },

  location: {
    marginBottom: 5,
    fontSize: 12,
    ...(Platform.OS === 'web' && {
      width: 120,
      fontSize: 14,
      height: 25,
      alignContent: 'center',
    }),
  },

  expirationText: {
    color: colors.error,
  },

  expirationTextContainer: {
    textAlign: 'center',
    width: '25%',
  },

  // Error
  errorMessage: {
    color: colors.error,
    textAlign: 'center',
    marginTop: 10,
  },

  // Settings
  settingsIcon: {

  },
});

export default GlobalStyles;
