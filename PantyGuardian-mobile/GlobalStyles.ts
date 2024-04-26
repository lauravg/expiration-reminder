import { StyleSheet } from 'react-native';

const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productDetails: {
    flexDirection: 'column', // Stacks the label-value pairs vertically
    marginBottom: 5,
  },
  detailRow: {  // This will align the label and value in a single row
    flexDirection: 'row',
    marginBottom: 5,  // Adds some spacing between each detail row
  },
  detailLabel: {
    fontWeight: 'bold',
    marginRight: 10,  // Increase space between label and value
  },
  detailValue: {
    flex: 1,  // Takes remaining space, ensuring the label and value are spaced out according to the text length
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
    backgroundColor: '#ddd',
    elevation: 0, // Remove shadow
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  input: {
    marginBottom: 10,
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
  },
  button: {
},
settingsIcon: {}
});

export default GlobalStyles;
