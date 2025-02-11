import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Modal as PaperModal, Button, TextInput, IconButton, FAB, Menu } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { parse, isValid } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { calculateDaysLeft } from './utils/dateUtils';
import EditProductModal from './EditProductModal';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Requests from './Requests';

type ViewMode = 'grid' | 'list' | 'simple';

interface ProductListProps {
    products: Product[];
    onDelete: (product: Product) => Promise<void>;
    onUpdateProduct: (product: Product) => Promise<void>;
    onWaste?: (product: Product) => Promise<void>;
    showWasteButton?: boolean;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    searchQuery: string;
    searchTerm: string;
    onSort: (option: string) => void;
    sortMenuVisible: boolean;
    setSortMenuVisible: (visible: boolean) => void;
    menuVisible: boolean;
    setMenuVisible: (visible: boolean) => void;
    getViewIcon: () => 'view-grid-outline' | 'view-list-outline' | 'format-list-text';
    selectedProduct?: Product | null;
    onProductSelect?: (product: Product | null) => void;
}

interface LocationItem {
    id: string;
    name: string;
}

interface EditProductModalProps {
    visible: boolean;
    onClose: () => void;
    product: Product | null;
    onUpdateProduct: (product: Product) => Promise<void>;
    locations: string[];
}

const ProductList: React.FC<ProductListProps> = ({
    products,
    onDelete,
    onUpdateProduct,
    showWasteButton = false,
    onWaste,
    viewMode,
    onViewModeChange,
    searchQuery,
    searchTerm,
    onSort,
    sortMenuVisible,
    setSortMenuVisible,
    menuVisible,
    setMenuVisible,
    getViewIcon,
    selectedProduct: externalSelectedProduct,
    onProductSelect,
}) => {
    const [internalSelectedProduct, setInternalSelectedProduct] = React.useState<Product | null>(null);
    
    // Use either external or internal state based on whether onProductSelect is provided
    const effectiveSelectedProduct = onProductSelect ? (externalSelectedProduct || null) : internalSelectedProduct;
    const setEffectiveSelectedProduct = (product: Product | null) => {
        if (onProductSelect) {
            onProductSelect(product);
        } else {
            setInternalSelectedProduct(product);
        }
    };

    const [activeFilter, setActiveFilter] = React.useState<string>('All');
    const [editProductModalVisible, setEditProductModalVisible] = React.useState(false);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);
    const [sortBy, setSortBy] = useState('expirationDate');
    const [hideExpired, setHideExpired] = useState(false);
    const requests = new Requests();

    // Load saved view settings
    useEffect(() => {
        const loadViewSettings = async () => {
            try {
                const settings = await requests.getViewSettings();
                if (settings) {
                    onViewModeChange(settings.viewMode as ViewMode);
                    setSortBy(settings.sortBy);
                    setHideExpired(settings.hideExpired);
                    setActiveFilter(settings.activeFilter);
                }
            } catch (error) {
                console.error('Failed to load view settings:', error);
            }
        };
        loadViewSettings();
    }, []);

    // Save view settings whenever they change
    useEffect(() => {
        const saveViewSettings = async () => {
            try {
                await requests.saveViewSettings({
                    viewMode,
                    sortBy,
                    hideExpired,
                    activeFilter
                });
            } catch (error) {
                console.error('Failed to save view settings:', error);
            }
        };
        saveViewSettings();
    }, [viewMode, sortBy, hideExpired, activeFilter]);

    const handleSort = (products: Product[]) => {
        switch (sortBy) {
            case 'expirationDate':
                return [...products].sort((a, b) => {
                    // Handle special cases first
                    if (!a.expiration_date && !b.expiration_date) return 0;
                    if (!a.expiration_date) return 1;
                    if (!b.expiration_date) return -1;
                    if (a.expiration_date === 'No Expiration' && b.expiration_date === 'No Expiration') return 0;
                    if (a.expiration_date === 'No Expiration') return 1;
                    if (b.expiration_date === 'No Expiration') return -1;

                    try {
                        const dateA = parse(a.expiration_date, 'MMM dd yyyy', new Date());
                        const dateB = parse(b.expiration_date, 'MMM dd yyyy', new Date());
                        
                        if (!isValid(dateA) && !isValid(dateB)) return 0;
                        if (!isValid(dateA)) return 1;
                        if (!isValid(dateB)) return -1;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        dateA.setHours(0, 0, 0, 0);
                        dateB.setHours(0, 0, 0, 0);
                        
                        const diffA = Math.ceil((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const diffB = Math.ceil((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return diffA - diffB;
                    } catch (error) {
                        console.error('Error parsing dates:', error);
                        return 0;
                    }
                });
            case 'name':
                return [...products].sort((a, b) => a.product_name.localeCompare(b.product_name));
            case 'location':
                return [...products].sort((a, b) => {
                    const locA = a.location || '';
                    const locB = b.location || '';
                    return locA.localeCompare(locB);
                });
            default:
                return products;
        }
    };

    const filteredProducts = useMemo(() => {
        // First apply location filter
        let filtered = products;
        
        if (activeFilter === 'No Location') {
            filtered = products.filter(product => !product.location);
        } else if (activeFilter !== 'All') {
            filtered = products.filter(product => product.location === activeFilter);
        }

        // Apply hide expired filter if enabled
        if (hideExpired) {
            filtered = filtered.filter(product => {
                if (!product.expiration_date || product.expiration_date === 'No Expiration') return true;
                try {
                    const expDate = parse(product.expiration_date, 'MMM dd yyyy', new Date());
                    if (!isValid(expDate)) return true;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    expDate.setHours(0, 0, 0, 0);
                    
                    return expDate.getTime() >= today.getTime();
                } catch (error) {
                    console.error('Error parsing date:', error);
                    return true;
                }
            });
        }

        // Then apply search filter if there's a search query
        if (searchQuery) {
            filtered = filtered.filter(product => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    product.product_name.toLowerCase().includes(searchLower) ||
                    (product.location || '').toLowerCase().includes(searchLower) ||
                    (product.category || '').toLowerCase().includes(searchLower) ||
                    (product.note || '').toLowerCase().includes(searchLower)
                );
            });
        }

        // Then sort the filtered results
        switch (sortBy) {
            case 'expirationDate':
                return filtered.sort((a, b) => {
                    // Handle special cases first
                    if (!a.expiration_date && !b.expiration_date) return 0;
                    if (!a.expiration_date) return 1;
                    if (!b.expiration_date) return -1;
                    if (a.expiration_date === 'No Expiration' && b.expiration_date === 'No Expiration') return 0;
                    if (a.expiration_date === 'No Expiration') return 1;
                    if (b.expiration_date === 'No Expiration') return -1;

                    try {
                        const dateA = parse(a.expiration_date, 'MMM dd yyyy', new Date());
                        const dateB = parse(b.expiration_date, 'MMM dd yyyy', new Date());
                        
                        if (!isValid(dateA) && !isValid(dateB)) return 0;
                        if (!isValid(dateA)) return 1;
                        if (!isValid(dateB)) return -1;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        dateA.setHours(0, 0, 0, 0);
                        dateB.setHours(0, 0, 0, 0);
                        
                        const diffA = Math.ceil((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const diffB = Math.ceil((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return diffA - diffB;
                    } catch (error) {
                        console.error('Error parsing dates:', error);
                        return 0;
                    }
                });
            case 'name':
                return filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
            case 'location':
                return filtered.sort((a, b) => {
                    const locA = a.location || '';
                    const locB = b.location || '';
                    return locA.localeCompare(locB);
                });
            default:
                return filtered;
        }
    }, [products, activeFilter, sortBy, searchQuery, hideExpired]);

    const getDaysUntilExpiration = (expirationDate: string | undefined | null) => {
        if (!expirationDate || expirationDate === 'No Expiration') return null;
        
        try {
            const expDate = parse(expirationDate, 'MMM dd yyyy', new Date());
            if (!isValid(expDate)) {
                console.log('Invalid date format:', expirationDate);
                return null;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    };

    const getExpirationText = (daysUntilExpiration: number | null) => {
        if (daysUntilExpiration === null) return 'No Expiration';
        if (isNaN(daysUntilExpiration)) return 'Invalid date';
        if (daysUntilExpiration < 0) return `Expired ${Math.abs(daysUntilExpiration)} days ago`;
        if (daysUntilExpiration === 0) return 'Expires today';
        if (daysUntilExpiration === 1) return '1 day left';
        return `${daysUntilExpiration} days left`;
    };

    // Keep original string array for the picker
    const locationStrings = useMemo(() => {
        const uniqueLocations = new Set(products
            .filter(product => product?.location && typeof product.location === 'string')
            .map(product => product.location as string));
        return ['No Location', ...Array.from(uniqueLocations)];
    }, [products]);

    // Create location items for the filter list
    const locationItems = useMemo<LocationItem[]>(() => {
        const items: LocationItem[] = [
            { id: 'filter-all', name: 'All' }
        ];
        
        locationStrings.forEach(loc => {
            if (loc !== 'All') {
                items.push({
                    id: `filter-${loc.toLowerCase().replace(/\s+/g, '-')}`,
                    name: loc
                });
            }
        });
        
        return items;
    }, [locationStrings]);

    const handleDelete = async (product: Product) => {
        await onDelete(product);
        setEffectiveSelectedProduct(null);
    };

    const handleWaste = async (product: Product) => {
        if (onWaste) {
            await onWaste(product);
            setEffectiveSelectedProduct(null);
        }
    };

    const handleUpdateProduct = async (updatedProduct: Product) => {
        await onUpdateProduct(updatedProduct);
        setEditProductModalVisible(false);
        setEffectiveSelectedProduct(null);
    };

    const getExpirationStyles = (daysUntilExpiration: number | null) => {
        if (daysUntilExpiration === null) return {};
        if (daysUntilExpiration < 0) {
            return {
                badge: GlobalStyles.expirationBadgeExpired,
                text: GlobalStyles.expirationTextExpired,
            };
        } else if (daysUntilExpiration <= 1) {
            return {
                badge: GlobalStyles.expirationBadgeWarning,
                text: GlobalStyles.expirationTextWarning,
            };
        }
        return {};
    };

    const renderProductGrid = () => {
        const rows = [];
        for (let i = 0; i < filteredProducts.length; i += 2) {
            const row = (
                <View key={i} style={GlobalStyles.productRow}>
                    {renderProductCard(filteredProducts[i])}
                    {i + 1 < filteredProducts.length && renderProductCard(filteredProducts[i + 1])}
                </View>
            );
            rows.push(row);
        }
        return rows;
    };

    const renderProductCard = (product: Product) => {
        if (!product) return null;

        console.log('Product expiration date:', product.expiration_date);
        
        let daysUntilExpiration = null;
        if (product.expiration_date && product.expiration_date !== 'No Expiration') {
            try {
                // Parse date in format "MMM DD YYYY"
                const monthMap: { [key: string]: number } = {
                    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                
                const parts = product.expiration_date.split(' ');
                const month = monthMap[parts[0]];
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                
                if (month !== undefined && !isNaN(day) && !isNaN(year)) {
                    const expDate = new Date(year, month, day);
                    const today = new Date();
                    
                    // Reset time portions
                    expDate.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    
                    const diffTime = expDate.getTime() - today.getTime();
                    daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    console.log('Parsed date:', expDate.toISOString(), 'Days until expiration:', daysUntilExpiration);
                }
            } catch (error) {
                console.error('Error parsing date:', error, product.expiration_date);
            }
        }

        const daysLeft = calculateDaysLeft(product.expiration_date ?? '');
        const expirationStyles = getExpirationStyles(daysUntilExpiration);
        const displayLocation = product.location || 'No Location';
        const expirationText = getExpirationText(daysUntilExpiration);

        if (viewMode === 'grid') {
            return (
                <TouchableOpacity
                    key={product.product_id}
                    style={GlobalStyles.productCardGrid}
                    onPress={() => setEffectiveSelectedProduct(product)}
                >
                    <View style={GlobalStyles.productImagePlaceholderGrid}>
                        <Icon name="food" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                    </View>
                    <Text style={GlobalStyles.productNameGrid} numberOfLines={1}>
                        {product.product_name || 'Unnamed Product'}
                    </Text>
                    <Text style={GlobalStyles.productLocationGrid} numberOfLines={1}>
                        {displayLocation}
                    </Text>
                    <View style={GlobalStyles.expirationContainerGrid}>
                        <View style={[GlobalStyles.expirationBadge, expirationStyles.badge]}>
                            <Text style={[GlobalStyles.expirationText, expirationStyles.text]}>
                                {expirationText}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        if (viewMode === 'list') {
            return (
                <TouchableOpacity
                    key={product.product_id}
                    style={GlobalStyles.productCardList}
                    onPress={() => setEffectiveSelectedProduct(product)}
                >
                    <View style={GlobalStyles.productImagePlaceholderList}>
                        <Icon name="food" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                    </View>
                    <View style={GlobalStyles.productInfoList}>
                        <Text style={GlobalStyles.productNameList} numberOfLines={1}>
                            {product.product_name || 'Unnamed Product'}
                        </Text>
                        <View style={GlobalStyles.productLocationList}>
                            <Icon 
                                name="map-marker-outline" 
                                size={16} 
                                color={colors.textSecondary} 
                                style={GlobalStyles.locationIcon} 
                            />
                            <Text style={GlobalStyles.productLocationList} numberOfLines={1}>
                                {displayLocation}
                            </Text>
                        </View>
                        <View style={GlobalStyles.expirationContainerList}>
                            <View style={[GlobalStyles.expirationBadge, expirationStyles.badge]}>
                                <Text style={[GlobalStyles.expirationText, expirationStyles.text]}>
                                    {expirationText}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // Simple list view
        return (
            <TouchableOpacity
                key={product.product_id}
                style={GlobalStyles.productCardSimple}
                onPress={() => setEffectiveSelectedProduct(product)}
            >
                <View style={GlobalStyles.productInfoSimple}>
                    <Text style={GlobalStyles.productNameSimple} numberOfLines={1}>
                        {product.product_name || 'Unnamed Product'}
                    </Text>
                    <View style={GlobalStyles.productLocationSimple}>
                        <Icon 
                            name="map-marker-outline" 
                            size={14} 
                            color={colors.textSecondary} 
                            style={GlobalStyles.locationIcon} 
                        />
                        <Text numberOfLines={1}>
                            {displayLocation}
                        </Text>
                    </View>
                </View>
                <View style={[GlobalStyles.expirationBadge, expirationStyles.badge]}>
                    <Text style={[GlobalStyles.expirationText, expirationStyles.text]}>
                        {expirationText}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderProducts = () => {
        if (viewMode === 'grid') {
            return renderProductGrid();
        }
        return filteredProducts.map((product) => renderProductCard(product));
    };

    return (
        <View style={GlobalStyles.containerWithHeader}>
            <ScrollView>
                <View style={GlobalStyles.headerContainer}>
                    <View style={GlobalStyles.iconContainer}>
                        <Menu
                            visible={filterMenuVisible}
                            onDismiss={() => setFilterMenuVisible(false)}
                            anchor={
                                <MaterialCommunityIcons
                                    name="filter-variant"
                                    size={24}
                                    onPress={() => setFilterMenuVisible(true)}
                                    style={GlobalStyles.icon}
                                />
                            }
                        >
                            <Menu.Item 
                                leadingIcon={hideExpired ? "checkbox-marked" : "checkbox-blank-outline"}
                                onPress={() => {
                                    setHideExpired(!hideExpired);
                                    setFilterMenuVisible(false);
                                }} 
                                title="Hide Expired Products"
                            />
                            <Menu.Item 
                                leadingIcon="apps"
                                onPress={() => {
                                    setActiveFilter('All');
                                    setFilterMenuVisible(false);
                                }} 
                                title="All Products"
                            />
                            <Menu.Item 
                                leadingIcon="map-marker-off"
                                onPress={() => {
                                    setActiveFilter('No Location');
                                    setFilterMenuVisible(false);
                                }} 
                                title="No Location"
                            />
                            <Menu.Item 
                                leadingIcon="fridge"
                                onPress={() => {
                                    setActiveFilter('Fridge');
                                    setFilterMenuVisible(false);
                                }} 
                                title="Fridge"
                            />
                            <Menu.Item 
                                leadingIcon="fridge-variant"
                                onPress={() => {
                                    setActiveFilter('Freezer');
                                    setFilterMenuVisible(false);
                                }} 
                                title="Freezer"
                            />
                            <Menu.Item 
                                leadingIcon="cupboard"
                                onPress={() => {
                                    setActiveFilter('Pantry');
                                    setFilterMenuVisible(false);
                                }} 
                                title="Pantry"
                            />
                        </Menu>

                        <Menu
                            visible={sortMenuVisible}
                            onDismiss={() => setSortMenuVisible(false)}
                            anchor={
                                <MaterialCommunityIcons
                                    name="sort-calendar-descending"
                                    size={24}
                                    onPress={() => setSortMenuVisible(true)}
                                    style={GlobalStyles.icon}
                                />
                            }>
                            <Menu.Item 
                                leadingIcon="calendar-clock"
                                onPress={() => {
                                    setSortBy('expirationDate');
                                    setSortMenuVisible(false);
                                }} 
                                title="Expiration Date (Soonest)" 
                            />
                            <Menu.Item 
                                leadingIcon="sort-alphabetical-ascending"
                                onPress={() => {
                                    setSortBy('name');
                                    setSortMenuVisible(false);
                                }} 
                                title="Name (A to Z)" 
                            />
                            <Menu.Item 
                                leadingIcon="map-marker"
                                onPress={() => {
                                    setSortBy('location');
                                    setSortMenuVisible(false);
                                }} 
                                title="Location" 
                            />
                        </Menu>

                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <MaterialCommunityIcons
                                    name={getViewIcon()}
                                    size={24}
                                    onPress={() => setMenuVisible(true)}
                                    style={GlobalStyles.icon}
                                />
                            }
                        >
                            <Menu.Item
                                leadingIcon="view-grid-outline"
                                onPress={() => {
                                    onViewModeChange('grid');
                                    setMenuVisible(false);
                                }}
                                title="Grid View"
                            />
                            <Menu.Item
                                leadingIcon="view-list-outline"
                                onPress={() => {
                                    onViewModeChange('list');
                                    setMenuVisible(false);
                                }}
                                title="List View"
                            />
                            <Menu.Item
                                leadingIcon="format-list-text"
                                onPress={() => {
                                    onViewModeChange('simple');
                                    setMenuVisible(false);
                                }}
                                title="Simple List"
                            />
                        </Menu>
                    </View>
                    
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={GlobalStyles.categoriesContainer}
                    >
                        {locationItems.map((location) => (
                            <TouchableOpacity
                                key={location.id}
                                onPress={() => setActiveFilter(location.name)}
                                style={[
                                    GlobalStyles.categoryChip,
                                    activeFilter === location.name && GlobalStyles.categoryChipActive
                                ]}
                            >
                                <Text
                                    style={[
                                        GlobalStyles.categoryText,
                                        activeFilter === location.name && GlobalStyles.categoryTextActive
                                    ]}
                                >
                                    {location.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={
                    viewMode === 'grid' 
                        ? GlobalStyles.productGrid 
                        : viewMode === 'list'
                        ? GlobalStyles.productList
                        : GlobalStyles.productListSimple
                }>
                    {renderProducts()}
                </View>
            </ScrollView>

            {effectiveSelectedProduct && (
                <PaperModal
                    visible={true}
                    onDismiss={() => setEffectiveSelectedProduct(null)}
                    contentContainerStyle={GlobalStyles.modalContent}
                >
                    <View style={GlobalStyles.modalHeader}>
                        <Text style={GlobalStyles.modalTitle}>Product Details</Text>
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={() => setEffectiveSelectedProduct(null)}
                            style={GlobalStyles.modalClose}
                        />
                    </View>

                    <ScrollView style={GlobalStyles.detailCard}>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="food-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Product Name</Text>
                            <Text style={GlobalStyles.detailValue}>{effectiveSelectedProduct.product_name}</Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Creation Date</Text>
                            <Text style={GlobalStyles.detailValue}>{effectiveSelectedProduct.creation_date}</Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="calendar-clock" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Expiration Date</Text>
                            <Text style={GlobalStyles.detailValue}>
                                {effectiveSelectedProduct.expiration_date ?? 'N/A'}
                            </Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="map-marker-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Location</Text>
                            <Text style={GlobalStyles.detailValue}>{effectiveSelectedProduct.location}</Text>
                        </View>
                        {effectiveSelectedProduct.category && (
                            <View style={GlobalStyles.detailRow}>
                                <View style={GlobalStyles.detailIcon}>
                                    <Icon name="tag-outline" size={20} color={colors.textSecondary} />
                                </View>
                                <Text style={GlobalStyles.detailLabel}>Category</Text>
                                <Text style={GlobalStyles.detailValue}>{effectiveSelectedProduct.category}</Text>
                            </View>
                        )}
                        {effectiveSelectedProduct.note && (
                            <View style={GlobalStyles.detailRow}>
                                <View style={GlobalStyles.detailIcon}>
                                    <Icon name="note-text-outline" size={20} color={colors.textSecondary} />
                                </View>
                                <Text style={GlobalStyles.detailLabel}>Note</Text>
                                <Text style={GlobalStyles.detailValue}>{effectiveSelectedProduct.note}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={GlobalStyles.actionButtonContainer}>
                        <Button
                            mode="contained"
                            style={[GlobalStyles.actionButton, GlobalStyles.actionButtonPrimary]}
                            labelStyle={[GlobalStyles.actionButtonText, GlobalStyles.actionButtonTextPrimary]}
                            onPress={() => {
                                setEditProductModalVisible(true);
                            }}
                        >
                            Edit
                        </Button>
                        {showWasteButton && onWaste && (
                            <Button
                                mode="contained"
                                style={GlobalStyles.actionButton}
                                labelStyle={GlobalStyles.actionButtonText}
                                onPress={() => handleWaste(effectiveSelectedProduct)}
                            >
                                Waste
                            </Button>
                        )}
                        <Button
                            mode="contained"
                            style={[GlobalStyles.actionButton, GlobalStyles.actionButtonDanger]}
                            labelStyle={[GlobalStyles.actionButtonText, GlobalStyles.actionButtonTextDanger]}
                            onPress={() => handleDelete(effectiveSelectedProduct)}
                        >
                            Delete
                        </Button>
                    </View>
                </PaperModal>
            )}

            <EditProductModal
                visible={editProductModalVisible}
                onClose={() => setEditProductModalVisible(false)}
                product={effectiveSelectedProduct}
                onUpdateProduct={handleUpdateProduct}
                locations={locationStrings}
            />
        </View>
    );
};

export default ProductList;