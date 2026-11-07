export class CreateMenuItemDto {
  name: string;
  category_id: number;
  description?: string;
  price: number;
  promo_price?: number;
  image_url?: string;
  status?: string; // 'available' | 'soldout' | 'hidden'
  show_on_qr?: boolean;
}

export class UpdateMenuItemDto {
  name?: string;
  category_id?: number;
  description?: string;
  price?: number;
  promo_price?: number;
  image_url?: string;
  status?: string;
  show_on_qr?: boolean;
}
