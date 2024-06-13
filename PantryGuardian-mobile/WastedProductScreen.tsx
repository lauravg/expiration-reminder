import { format, isValid, parse } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { Product } from './Product';
import ProductList from './ProductList';

const WastedProductScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);

  const requests = new Requests();

  const handleDelete = async (product: Product) => {
    const success = await requests.deleteProduct(product.product_id);
    if (success) {
      setProducts(products.filter(p => p.product_id !== product.product_id));
    } else {
      console.error('Failed to delete product');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const success = await requests.updateProduct(updatedProduct);
    if (success) {
      setProducts(products.map(p => p.product_id === updatedProduct.product_id ? updatedProduct : p));
    } else {
      console.error('Failed to update product');
    }
  };

  useEffect(() => {
    requests.listProducts().then((products) => {
      const wastedProducts = products.filter((product) => product.wasted);
      const formattedProducts = wastedProducts.map(product => {
        let formattedExpirationDate = '';
        if (product.expiration_date) {
          try {
            const parsedDate = parse(product.expiration_date, 'MMM dd yyyy', new Date());

            if (isValid(parsedDate)) {
              formattedExpirationDate = format(parsedDate, 'yyyy-MM-dd');
            }
          } catch (error) {
            console.error('Error parsing expiration date:', product.expiration_date, error);
          }
        }
        return {
          ...product,
          expiration_date: formattedExpirationDate ?? '',
        };
      });
      setProducts(formattedProducts);
    });
  }, []);

  useEffect(() => {
    const updateWastedProducts = async () => {
      const products = await requests.listProducts();
      const wastedProducts = products.filter(product => product.wasted);
      setProducts(wastedProducts);
    };
    const interval = setInterval(updateWastedProducts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={GlobalStyles.container}>
      <ProductList
        products={products}
        onDelete={handleDelete}
        onUpdateProduct={handleUpdateProduct}
      />
    </View>
  );
};

export default WastedProductScreen;
