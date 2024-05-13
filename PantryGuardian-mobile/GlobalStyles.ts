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
    marginBottom: 20,
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
  productList: {
    marginBottom: 20,
    ...(Platform.OS === 'web' && {
      width: '80%',
      height: 600,
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
      padding: 60,
    }),
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
  product: {
    paddingLeft: 0,
  },
  productContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeContainer: {
    justifyContent: 'center',
  },
  badge: {
    width: 60,
    fontSize: 12,
    ...(Platform.OS === 'web' && {
      width: 120,
      fontSize: 14,
      height: 25,
      alignContent: 'center',
    }),
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
