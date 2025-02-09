import { Product } from './Product';

export const getViewIcon = (viewMode?: 'grid' | 'list' | 'simple') => {
  switch (viewMode) {
    case 'grid':
      return 'view-grid-outline';
    case 'list':
      return 'view-list-outline';
    case 'simple':
      return 'format-list-text';
    default:
      return 'view-list-outline'; // default to list view icon
  }
}; 