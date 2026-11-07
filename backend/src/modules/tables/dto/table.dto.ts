export class CreateZoneDto {
  name!: string;
  sort_order?: number;
}

export class UpdateZoneDto {
  name?: string;
  sort_order?: number;
}

export class CreateTableDto {
  number?: number;
  seats?: number;
  zone_id?: number;
  status?: 'free' | 'occupied' | 'cleaning' | 'reserved';
}

export class UpdateTableDto {
  number?: number;
  seats?: number;
  zone_id?: number;
  status?: 'free' | 'occupied' | 'cleaning' | 'reserved';
}

export class UpdateTableStatusDto {
  status!: 'free' | 'occupied' | 'cleaning' | 'reserved';
}

export class SwitchTableDto {
  from_table_id?: number;
  from_table_number?: number;
  to_table_id?: number;
  to_table_number?: number;
}
