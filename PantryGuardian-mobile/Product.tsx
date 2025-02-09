import { calculateDaysLeft } from "./utils/dateUtils";

export interface Product {
  product_id: string;
  product_name: string;
  expiration_date?: string;
  location?: string;
  category?: string;
  barcode?: string;
  wasted: boolean;
  creation_date?: string;
  note?: string;
}

interface ProductProps {
  name: string;
  expiryDate?: string;
}
const Product: React.FC<ProductProps> = ({ name, expiryDate }) => {
    const daysLeft = expiryDate ? calculateDaysLeft(expiryDate) : undefined;

    return (
        <div>
            <h3>{name}</h3>
            <p>{daysLeft ? `${daysLeft} days` : 'No expiry date'}</p>
        </div>
    );
};