import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Image } from 'react-native';
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
    sortBy: string;
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    hideExpired: boolean;
    setHideExpired: (hide: boolean) => void;
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
    sortBy,
    activeFilter,
    setActiveFilter,
    hideExpired,
    setHideExpired,
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

    const [editProductModalVisible, setEditProductModalVisible] = React.useState(false);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);

    const parseDateString = (dateStr: string): Date | null => {
        if (!dateStr || dateStr === 'No Expiration') {
            return null;
        }
        try {
            let expDate: Date;
            if (dateStr.includes('-')) {
                // yyyy-MM-dd format
                expDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            } else {
                // MMM dd yyyy format
                expDate = parse(dateStr, 'MMM dd yyyy', new Date());
            }
            return isValid(expDate) ? expDate : null;
        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    };

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

                    const dateA = parseDateString(a.expiration_date);
                    const dateB = parseDateString(b.expiration_date);
                    
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;

                    return (dateA as Date).getTime() - (dateB as Date).getTime();
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
        activeFilter = (activeFilter == undefined) ? 'All' : activeFilter;

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
                    const expDate = parseDateString(product.expiration_date);
                    if (!expDate || !isValid(expDate)) return true;
                    
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

        return handleSort(filtered);
    }, [products, activeFilter, hideExpired, searchQuery]);

    const getDaysUntilExpiration = (expirationDate: string | undefined | null) => {
        if (!expirationDate || expirationDate === 'No Expiration') return null;
        
        const expDate = parseDateString(expirationDate);
        if (!expDate || !isValid(expDate)) {
            console.log('Invalid date format:', expirationDate);
            return null;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log('Product expiration date:', expirationDate, 'Parsed date:', expDate.toISOString(), 'Days until expiration:', diffDays);
        return diffDays;
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
            const expDate = parseDateString(product.expiration_date);
            if (expDate && isValid(expDate)) {
                const today = new Date();
                // Reset time portions
                expDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                
                const diffTime = expDate.getTime() - today.getTime();
                daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                console.log('Parsed date:', expDate.toISOString(), 'Days until expiration:', daysUntilExpiration);
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
                        {product.image_url ? (
                            <Image 
                                source={{ uri: product.image_url }} 
                                style={GlobalStyles.productImage} 
                                resizeMode="cover"
                            />
                        ) : (
                            <Icon name="food" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        )}
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
                        {product.image_url ? (
                            <Image 
                                source={{ uri: product.image_url }} 
                                style={GlobalStyles.productImage} 
                                resizeMode="cover"
                            />
                        ) : (
                            <Icon name="food" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        )}
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
        console.log('Rendering products: ', filteredProducts.length);
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
                                    onSort('expirationDate');
                                    setSortMenuVisible(false);
                                }} 
                                title="Expiration Date (Soonest)" 
                            />
                            <Menu.Item 
                                leadingIcon="sort-alphabetical-ascending"
                                onPress={() => {
                                    onSort('name');
                                    setSortMenuVisible(false);
                                }} 
                                title="Name (A to Z)" 
                            />
                            <Menu.Item 
                                leadingIcon="map-marker"
                                onPress={() => {
                                    onSort('location');
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
            />
        </View>
    );
};

export default ProductList;