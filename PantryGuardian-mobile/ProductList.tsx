import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Modal as PaperModal, Button, TextInput, IconButton, FAB, Menu } from 'react-native-paper';
import { parse } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { calculateDaysLeft } from './utils/dateUtils';
import EditProductModal from './EditProductModal';

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

    const filteredProducts = products.filter((product) => {
        if (!product) return false;

        const productName = (product.product_name || '').toLowerCase();
        const searchTermLower = (searchTerm || '').toLowerCase();
        const location = product.location || '';

        const matchesSearch = productName.includes(searchTermLower);
        const matchesFilter = 
            activeFilter === 'All' || 
            (activeFilter === 'No Location' ? !location : location === activeFilter);

        return matchesSearch && matchesFilter;
    });

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

    const getExpirationStyles = (daysLeft: string) => {
        if (daysLeft === 'Expired') {
            return {
                badge: GlobalStyles.expirationBadgeExpired,
                text: GlobalStyles.expirationTextExpired,
            };
        } else if (parseInt(daysLeft) <= 7) {
            return {
                badge: GlobalStyles.expirationBadgeExpiring,
                text: GlobalStyles.expirationTextExpiring,
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

        const daysLeft = calculateDaysLeft(product.expiration_date ?? '');
        const expirationStyles = getExpirationStyles(daysLeft);
        const displayLocation = product.location || 'No Location';

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
                                {daysLeft}
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
                                    {daysLeft}
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
                        {daysLeft}
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