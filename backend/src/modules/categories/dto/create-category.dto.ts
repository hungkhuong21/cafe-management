export class CreateCategoryDto {
  name: string;
  description?: string;
  image_url?: string;
  status?: string; // 'active' | 'inactive'
  sort_order?: number;
}

export class UpdateCategoryDto {
  name?: string;
  description?: string;
  image_url?: string;
  status?: string;
  sort_order?: number;
}
