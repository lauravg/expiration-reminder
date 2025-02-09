import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Modal as PaperModal, Button, TextInput, IconButton, FAB, Menu } from 'react-native-paper';
import { parse } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { calculateDaysLeft } from './utils/dateUtils';
import EditProductModal from './EditProductModal';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

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
}) => {
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
    const [activeFilter, setActiveFilter] = React.useState('All');
    const [editProductModalVisible, setEditProductModalVisible] = React.useState(false);
    const [menuVisible, setMenuVisible] = React.useState(false);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [sortBy, setSortBy] = useState('expirationDate'); // 'expirationDate', 'name', 'location'

    const handleSort = (products: Product[]) => {
        switch (sortBy) {
            case 'expirationDate':
                return [...products].sort((a, b) => {
                    const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : Infinity;
                    const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : Infinity;
                    return dateA - dateB;
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
        let filtered = products;
        
        if (activeFilter === 'No Location') {
            filtered = products.filter(product => !product.location);
        } else if (activeFilter !== 'All') {
            filtered = products.filter(product => product.location === activeFilter);
        }

        return handleSort(filtered);
    }, [products, activeFilter, sortBy]);

    const getDaysUntilExpiration = (expirationDate: string | undefined | null) => {
        if (!expirationDate) return null;
        
        try {
            const expDate = new Date(expirationDate);
            if (isNaN(expDate.getTime())) {
                console.log('Invalid date format:', expirationDate);
                return null;
            }
            
            const today = new Date();
            
            expDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    };

    const getExpirationText = (daysUntilExpiration: number | null) => {
        if (daysUntilExpiration === null) return 'Not expiring';
        if (isNaN(daysUntilExpiration)) return 'Invalid date';
        if (daysUntilExpiration < 0) return `Expired ${Math.abs(daysUntilExpiration)} days ago`;
        if (daysUntilExpiration === 0) return 'Expires today';
        if (daysUntilExpiration === 1) return '1 day';
        return `${daysUntilExpiration} days`;
    };

    const uniqueLocations = ['All', 'No Location', ...new Set(products
        .filter(product => product?.location)
        .map(product => product.location)
        .filter(Boolean)
    )].filter((loc): loc is string => typeof loc === 'string');

    const handleDelete = async (product: Product) => {
        await onDelete(product);
        setSelectedProduct(null);
    };

    const handleWaste = async (product: Product) => {
        if (onWaste) {
            await onWaste(product);
            setSelectedProduct(null);
        }
    };

    const handleUpdateProduct = async (updatedProduct: Product) => {
        await onUpdateProduct(updatedProduct);
        setEditProductModalVisible(false);
        setSelectedProduct(null);
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

    const getViewIcon = () => {
        switch (viewMode) {
            case 'grid':
                return 'view-grid-outline';
            case 'list':
                return 'view-list-outline';
            case 'simple':
                return 'format-list-text';
        }
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
                    onPress={() => setSelectedProduct(product)}
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
                    onPress={() => setSelectedProduct(product)}
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
                onPress={() => setSelectedProduct(product)}
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
                        {uniqueLocations.map((location) => (
                            <TouchableOpacity
                                key={location}
                                onPress={() => setActiveFilter(location)}
                                style={[
                                    GlobalStyles.categoryChip,
                                    activeFilter === location && GlobalStyles.categoryChipActive
                                ]}
                            >
                                <Text
                                    style={[
                                        GlobalStyles.categoryText,
                                        activeFilter === location && GlobalStyles.categoryTextActive
                                    ]}
                                >
                                    {location}
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

            {selectedProduct && (
                <PaperModal
                    visible={true}
                    onDismiss={() => setSelectedProduct(null)}
                    contentContainerStyle={GlobalStyles.modalContent}
                >
                    <View style={GlobalStyles.modalHeader}>
                        <Text style={GlobalStyles.modalTitle}>Product Details</Text>
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={() => setSelectedProduct(null)}
                            style={GlobalStyles.modalClose}
                        />
                    </View>

                    <View style={GlobalStyles.detailCard}>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="food-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Product Name</Text>
                            <Text style={GlobalStyles.detailValue}>{selectedProduct.product_name}</Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Creation Date</Text>
                            <Text style={GlobalStyles.detailValue}>{selectedProduct.creation_date}</Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="calendar-clock" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Expiration Date</Text>
                            <Text style={GlobalStyles.detailValue}>
                                {selectedProduct.expiration_date ?? 'N/A'}
                            </Text>
                        </View>
                        <View style={GlobalStyles.detailRow}>
                            <View style={GlobalStyles.detailIcon}>
                                <Icon name="map-marker-outline" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={GlobalStyles.detailLabel}>Location</Text>
                            <Text style={GlobalStyles.detailValue}>{selectedProduct.location}</Text>
                        </View>
                        {selectedProduct.category && (
                            <View style={GlobalStyles.detailRow}>
                                <View style={GlobalStyles.detailIcon}>
                                    <Icon name="tag-outline" size={20} color={colors.textSecondary} />
                                </View>
                                <Text style={GlobalStyles.detailLabel}>Category</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.category}</Text>
                            </View>
                        )}
                        {selectedProduct.note && (
                            <View style={GlobalStyles.detailRow}>
                                <View style={GlobalStyles.detailIcon}>
                                    <Icon name="note-text-outline" size={20} color={colors.textSecondary} />
                                </View>
                                <Text style={GlobalStyles.detailLabel}>Note</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.note}</Text>
                            </View>
                        )}
                    </View>

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
                                onPress={() => handleWaste(selectedProduct)}
                            >
                                Waste
                            </Button>
                        )}
                        <Button
                            mode="contained"
                            style={[GlobalStyles.actionButton, GlobalStyles.actionButtonDanger]}
                            labelStyle={[GlobalStyles.actionButtonText, GlobalStyles.actionButtonTextDanger]}
                            onPress={() => handleDelete(selectedProduct)}
                        >
                            Delete
                        </Button>
                    </View>
                </PaperModal>
            )}

            <EditProductModal
                visible={editProductModalVisible}
                onClose={() => setEditProductModalVisible(false)}
                product={selectedProduct}
                onUpdateProduct={handleUpdateProduct}
                locations={uniqueLocations}
            />
        </View>
    );
};

export default ProductList;