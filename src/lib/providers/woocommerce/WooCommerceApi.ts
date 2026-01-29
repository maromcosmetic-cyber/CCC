import { WooCommerceProvider, WooCommerceProduct } from '../base/WooCommerceProvider';
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

/**
 * WooCommerce REST API Implementation
 */
export class WooCommerceApi implements WooCommerceProvider {
  private client: any;
  private storeUrl?: string;

  constructor(credentials?: { store_url?: string; consumer_key?: string; consumer_secret?: string; api_version?: string }) {
    if (credentials?.store_url && credentials?.consumer_key && credentials?.consumer_secret) {
      this.storeUrl = credentials.store_url;

      let url = String(credentials.store_url);
      if (!url.startsWith('http')) {
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          url = `http://${url}`;
        } else {
          url = `https://${url}`;
        }
      }

      this.client = new WooCommerceRestApi({
        url: url,
        consumerKey: credentials.consumer_key,
        consumerSecret: credentials.consumer_secret,
        version: ((credentials.api_version && credentials.api_version.match(/^v\d+$/)
          ? `wc/${credentials.api_version}`
          : credentials.api_version) || "wc/v3") as any,
        queryStringAuth: false,
        axiosConfig: {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": `Basic ${Buffer.from(credentials.consumer_key + ":" + credentials.consumer_secret).toString('base64')}`
          }
        }
      });
    }
  }

  async syncProducts(storeUrl?: string, credentials?: any): Promise<WooCommerceProduct[]> {
    try {
      // Use instance client if available, or create temporary one if credentials provided
      let client = this.client;

      if (!client && storeUrl && credentials) {
        let url = String(storeUrl);
        if (!url.startsWith('http')) {
          if (url.includes('localhost') || url.includes('127.0.0.1')) {
            url = `http://${url}`;
          } else {
            url = `https://${url}`;
          }
        }

        client = new WooCommerceRestApi({
          url: url,
          consumerKey: credentials.consumer_key,
          consumerSecret: credentials.consumer_secret,
          version: ((credentials.api_version && credentials.api_version.match(/^v\d+$/)
            ? `wc/${credentials.api_version}`
            : credentials.api_version) || "wc/v3") as any,
          queryStringAuth: false,
          axiosConfig: {
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "Authorization": `Basic ${Buffer.from(credentials.consumer_key + ":" + credentials.consumer_secret).toString('base64')}`
            }
          }
        });
      }

      if (!client) {
        throw new Error("WooCommerce client not initialized");
      }

      let allProducts: WooCommerceProduct[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`[WooCommerceApi] Syncing page ${page}...`);
        const response = await client.get("products", {
          per_page: 50,
          page: page
        });

        const products = response.data.map(this.transformProduct);

        if (products.length === 0) {
          hasMore = false;
        } else {
          allProducts = allProducts.concat(products);

          // If we got fewer than requested, we're likely done
          if (products.length < 50) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      console.log(`[WooCommerceApi] Total products synced: ${allProducts.length}`);
      return allProducts;
    } catch (error: any) {
      console.error("Failed to sync products:", error);
      throw new Error(`WooCommerce Sync Failed: ${error.message}`);
    }
  }

  async getProduct(productId: number): Promise<WooCommerceProduct> {
    if (!this.client) throw new Error("WooCommerce client not initialized");
    const response = await this.client.get(`products/${productId}`);
    return this.transformProduct(response.data);
  }

  async updateProduct(productId: number, updates: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    if (!this.client) throw new Error("WooCommerce client not initialized");

    // Map internal fields back to WC API format if needed
    // The updates object is likely coming from shared code, so we pass it directly
    // but ensure meta_data is formatted correctly if present
    const payload: any = { ...updates };

    // Safety check for regular_price / price fields
    if (payload.regular_price) payload.regular_price = String(payload.regular_price);
    if (payload.sale_price) payload.sale_price = String(payload.sale_price);

    const response = await this.client.put(`products/${productId}`, payload);
    return this.transformProduct(response.data);
  }

  async createProduct(product: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    if (!this.client) throw new Error("WooCommerce client not initialized");
    const response = await this.client.post("products", product);
    return this.transformProduct(response.data);
  }

  async deleteProduct(productId: number): Promise<void> {
    if (!this.client) throw new Error("WooCommerce client not initialized");
    await this.client.delete(`products/${productId}`, { force: true });
  }

  async getCategories(): Promise<Array<{ id: number; name: string }>> {
    if (!this.client) throw new Error("WooCommerce client not initialized");
    const response = await this.client.get("products/categories");
    return response.data;
  }

  private transformProduct(p: any): WooCommerceProduct {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      regular_price: p.regular_price,
      sale_price: p.sale_price,
      stock_status: p.stock_status,
      stock_quantity: p.stock_quantity,
      images: p.images,
      categories: p.categories,
      meta_data: p.meta_data,
      status: p.status
    };
  }
}
