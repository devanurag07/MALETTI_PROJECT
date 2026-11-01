/** Product from `salon/recommend-{skin,hair}-products/`. */
export interface RecommendedProduct {
  sku: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  product_type: string;
  recommendation_reason: string;
  recommendation_rank: number;
}

/** Service from `salon/recommend-{skin,hair}-services/`. */
export interface RecommendedService {
  title: string;
  description: string;
  image?: string | null;
  price?: number | null;
  currency?: string;
}
