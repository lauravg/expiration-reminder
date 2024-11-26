export interface Product {
  product_id: string;
  product_name: string;
  expiration_date?: string;
  location: string;
  category?: string;
  barcode?: string;
  wasted: boolean;
  creation_date?: string;
  note?: string;
}