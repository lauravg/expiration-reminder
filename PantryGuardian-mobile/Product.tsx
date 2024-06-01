export interface Product {
  product_id: string;
  product_name: string;
  expiration_date: string | null;
  location: string;
  category?: string;
  wasted: boolean;
  creation_date: string;
}