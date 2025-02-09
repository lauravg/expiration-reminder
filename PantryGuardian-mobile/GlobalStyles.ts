import { Dimensions, Platform, StyleSheet } from 'react-native';
import { colors, theme } from './theme';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GlobalStyles = StyleSheet.create({
  // Base Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  containerWithHeader: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
  },

  // Header Styles
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    paddingBottom: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  headerLeft: {
    flex: 1,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.5,
  },

  headerTop: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewToggle: {
    marginRight: 8,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.5,
  },

  // Search Bar
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 12,
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  searchInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchIcon: {
    marginRight: 12,
    opacity: 0.7,
  },

  // Category Chips
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
  },

  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  categoryChipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },

  categoryText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Grid View Styles
  productGrid: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },

  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  productCardGrid: {
    width: (screenWidth - 50) / 2,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 15,
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // List View Styles
  productList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  productCardList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  productImagePlaceholderGrid: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 15,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productImagePlaceholderList: {
    width: 80,
    height: 80,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  productInfoList: {
    flex: 1,
  },

  productNameGrid: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },

  productNameList: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },

  productLocationGrid: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },

  productLocationList: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIcon: {
    marginRight: 4,
    opacity: 0.6,
  },

  expirationContainerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  expirationContainerList: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  expirationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
  },

  expirationBadgeExpiring: {
    backgroundColor: colors.warning,
  },

  expirationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },

  expirationTextExpiring: {
    color: 'white',
  },

  expirationTextExpired: {
    color: 'white',
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Keep existing modal styles
  modalContent: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: screenHeight * 0.8,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

  modalClose: {
    padding: 8,
    marginRight: -8,
  },

  detailCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  detailIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    opacity: 0.5,
  },

  detailLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },

  detailValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceVariant,
    elevation: 0,
  },

  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },

  actionButtonDanger: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },

  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  actionButtonTextPrimary: {
    color: colors.textInverse,
  },

  actionButtonTextDanger: {
    color: colors.error,
  },

  // Simple List View Styles
  productListSimple: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  productCardSimple: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productInfoSimple: {
    flex: 1,
    marginRight: 12,
  },

  productNameSimple: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },

  productLocationSimple: {
    fontSize: 14,
    color: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 56,
    fontSize: 16,
  },

  buttonContainer: {
    // Define your button container styles here
  },

  button: {
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 12,
    height: 56,
  },

  pickerContainer: {
    // Define your picker container styles here
  },

  picker: {
    // Define your picker styles here
  },

  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.primary,
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    position: 'absolute',
  },

  loginLogo: {
    width: 200,
    height: 200,
    marginBottom: 40,
    resizeMode: 'contain',
  },

  errorMessage: {
    color: colors.error,
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },

  registerLink: {
    color: colors.textInverse,
    marginTop: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  productContainer: {
    // Define your product container styles here
  },

  productInfo: {
    // Define your product info styles here
  },

  productName: {
    // Define your product name styles here
  },

  location: {
    // Define your location styles here
  },

  expirationTextContainer: {
    // Define your expiration text container styles here
  },

  // Add new styles for settings screen
  preference: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  dropdown: {
    width: 150,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
  },

  simpleInput: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },

  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  filterActionButton: {
    margin: 0,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },

  headerContainer: {
    marginBottom: 10,
  },
  
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 10,
    marginBottom: 5,
  },
  
  icon: {
    marginLeft: 15,
    color: '#666',
  },

  expirationBadgeExpired: {
    backgroundColor: colors.error,
    opacity: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  
  expirationBadgeWarning: {
    backgroundColor: colors.warning,
    opacity: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
  expirationTextWarning: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
export default GlobalStyles;
