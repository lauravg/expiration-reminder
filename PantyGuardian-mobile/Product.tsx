export interface Product {
  product_name: string;
  creation_date: string;
  expiration_date: string;
  location: string;
  category?: string;
  product_id: number;
  expired: boolean;
  wasted: boolean;
  wasted_date?: string;

}
