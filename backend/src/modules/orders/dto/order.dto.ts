export class CreateOrderItemDto {
  menu_item_id: number;
  quantity: number;
  note?: string;
}

export class CreateOrderDto {
  table_id?: number | null;
  service_type?: 'dine_in' | 'take_away';
  customer_name?: string;
  customer_phone?: string;
  items: CreateOrderItemDto[];
}

export class UpdateOrderStatusDto {
  status?: string;
  payment_method?: string;
  payment_status?: 'unpaid' | 'paid';
}
