import React from 'react';
import { View, Text, ScrollView, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { List, Modal as PaperModal, Button, TextInput as PaperTextInput } from 'react-native-paper';
import { parse } from 'date-fns';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import { Product } from './Product';
import { calculateDaysLeft } from './utils/dateUtils';
import EditProductModal from './EditProductModal';
interface ProductListProps {
    products: Product[];
    onDelete: (product: Product) => Promise<void>;
    onUpdateProduct: (product: Product) => Promise<void>;
    onWaste?: (product: Product) => Promise<void>;
    showWasteButton?: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
    products,
    onDelete,
    onUpdateProduct,
    showWasteButton = false,
    onWaste,
}) => {
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('All');
    const [editProductModalVisible, setEditProductModalVisible] = React.useState(false);

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All' || product.location === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const uniqueLocations = ['All', ...new Set(products.map((product) => product.location))];

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

    return (
        <View style={GlobalStyles.containerWithHeader}>
            <ScrollView>
                <View style={GlobalStyles.content}>
                    <PaperTextInput
                        mode="outlined"
                        label="What are you searching for?"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={GlobalStyles.searchInput}
                        theme={{ colors: { primary: colors.primary } }}
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={GlobalStyles.filterContainer}>
                        {uniqueLocations.map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setActiveFilter(filter)}
                                style={GlobalStyles.filterButton}
                            >
                                <Text style={[GlobalStyles.filterText, activeFilter === filter && GlobalStyles.activeFilterText]}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={GlobalStyles.productList}>
                        <List.Section>
                            {filteredProducts.map((product, index) => (
                                <TouchableWithoutFeedback
                                    key={product.product_id}
                                    onPress={() => setSelectedProduct(product)}
                                >
                                    <View
                                        style={[
                                            GlobalStyles.productContainer,
                                            index === filteredProducts.length - 1 && { borderBottomWidth: 0 },
                                        ]}
                                    >
                                        <View style={GlobalStyles.productInfo}>
                                            <Text style={GlobalStyles.productName}>{product.product_name}</Text>
                                            <Text style={GlobalStyles.location}>{product.location}</Text>
                                        </View>
                                        <Text
                                            style={[
                                                GlobalStyles.expirationTextContainer,
                                                product.expiration_date && new Date(product.expiration_date) < new Date()
                                                    ? GlobalStyles.expirationText
                                                    : { color: colors.onProductBackground },
                                                calculateDaysLeft(product.expiration_date ?? '') === 'Expired' && { color: 'red' },
                                            ]}
                                        >
                                            {calculateDaysLeft(product.expiration_date ?? '')}
                                        </Text>
                                    </View>
                                </TouchableWithoutFeedback>
                            ))}
                        </List.Section>
                    </View>
                </View>
            </ScrollView>

            {selectedProduct && (
                <PaperModal
                    visible={true}
                    onDismiss={() => setSelectedProduct(null)}
                    contentContainerStyle={GlobalStyles.modalContent}
                >
                    <Text style={GlobalStyles.modalTitle}>Product Details</Text>
                    <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
                        <View style={GlobalStyles.productDetails}>
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Product Name:</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.product_name}</Text>
                            </View>
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Creation Date:</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.creation_date}</Text>
                            </View>
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Expiration Date:</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.expiration_date ?? 'N/A'}</Text>
                            </View>
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Time until Expiration:</Text>
                                <Text
                                    style={[
                                        GlobalStyles.expirationText,
                                        selectedProduct.expiration_date &&
                                        parse(selectedProduct.expiration_date ?? '', 'yyyy-MM-dd', new Date()) <
                                        new Date()
                                            ? GlobalStyles.expirationText
                                            : { color: colors.onProductBackground },
                                    ]}
                                >
                                    {calculateDaysLeft(selectedProduct.expiration_date ?? '')}
                                </Text>
                            </View>
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Location:</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.location}</Text>
                            </View>
                            {selectedProduct.category && (
                                <View style={GlobalStyles.detailRow}>
                                    <Text style={GlobalStyles.detailLabel}>Category:</Text>
                                    <Text style={GlobalStyles.detailValue}>{selectedProduct.category}</Text>
                                </View>
                            )}
                            <View style={GlobalStyles.detailRow}>
                                <Text style={GlobalStyles.detailLabel}>Note:</Text>
                                <Text style={GlobalStyles.detailValue}>{selectedProduct.note}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={GlobalStyles.modalButton}>
                        <Button
                            theme={{ colors: { primary: colors.primary } }}
                            onPress={() => {
                                setEditProductModalVisible(true);
                                setSelectedProduct(selectedProduct);
                            }}
                        >
                            Modify
                        </Button>
                        <Button
                            theme={{ colors: { primary: colors.primary } }}
                            onPress={() => handleDelete(selectedProduct)}
                        >
                            Delete
                        </Button>
                        {showWasteButton && onWaste && (
                            <Button theme={{ colors: { primary: colors.primary } }} onPress={() => handleWaste(selectedProduct)}>
                                Waste
                            </Button>
                        )}
                    </View>
                </PaperModal>
            )}

            <EditProductModal
                visible={editProductModalVisible}
                onClose={() => setEditProductModalVisible(false)}
                product={selectedProduct}
                onUpdateProduct={handleUpdateProduct}
            />
        </View>
    );
};

export default ProductList;