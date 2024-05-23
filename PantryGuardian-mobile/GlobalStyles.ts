import { Platform, StyleSheet } from 'react-native';

const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 20,
  },

  addButton: {
    marginBottom: 30,
    ...(Platform.OS === 'web' && {
      width: 200,
    }),
  },

  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  linkButton: {
    flex: 1,
  },

  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  modalContent: {
    backgroundColor: 'white',
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

  detailValue: {
    flex: 1,
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

  colorPicker: {
    backgroundColor: '#E0E0E0',
    elevation: 0,
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },

  input: {
    marginBottom: 10,
  },

  productList: {
    // backgroundColor: '#FFFFFF',
    // borderRadius: 10,
    // paddingHorizontal: 15,
    // paddingVertical: 5,

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
    backgroundColor: '#FFFFFF',
  },

  productInfo: {
    flexWrap: 'wrap',
    width: '65%',
  },

  productName: {
    fontSize: 16,
    flexWrap: 'wrap',
    fontWeight: '500',
    width: '100%',
  },

  badgeContainer: {
    flexDirection: 'column',
    width: '25%',

  },

  badge: {
    marginBottom: 5,
    fontSize: 12,
    width: '100%',
    ...(Platform.OS === 'web' && {
      width: 120,
      fontSize: 14,
      height: 25,
      alignContent: 'center',
    }),
  },

  expirationText: {
    color: 'red',
  },

  timeLeft: {
    textAlign: 'center',
    color: 'red',
  },

  button: {},
  settingsIcon: {},
  errorMessage: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default GlobalStyles;
