// WooCommerce Provider Interface

export interface WooCommerceProduct {
  id: number;
  name: string;
  description?: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  images: Array<{
    id: number;
    src: string;
    alt?: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
  }>;
  metadata?: Record<string, any>;
}

export interface WooCommerceProvider {
  syncProducts(storeUrl: string, credentials: any): Promise<WooCommerceProduct[]>;
  
  getProduct(productId: number): Promise<WooCommerceProduct>;
  
  updateProduct(
    productId: number,
    updates: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct>;
  
  createProduct(product: Partial<WooCommerceProduct>): Promise<WooCommerceProduct>;
  
  deleteProduct(productId: number): Promise<void>;
  
  getCategories(): Promise<Array<{ id: number; name: string }>>;
}


