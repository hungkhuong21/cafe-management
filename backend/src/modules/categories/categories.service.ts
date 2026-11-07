import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async findAll() {
    // Tự động kiểm tra hoặc fallback nếu cột chưa có
    try {
      const res = await this.db.query(`
        SELECT c.*, COUNT(m.id)::int as count 
        FROM categories c 
        LEFT JOIN menu_items m ON c.id = m.category_id 
        GROUP BY c.id 
        ORDER BY COALESCE(c.sort_order, 0) ASC, c.id ASC
      `);
      return res.rows;
    } catch (e) {
      const res = await this.db.query('SELECT * FROM categories ORDER BY id ASC');
      return res.rows;
    }
  }

  async findOne(id: number) {
    const res = await this.db.query('SELECT * FROM categories WHERE id = $1', [id]);
    return res.rows[0];
  }

  async create(dto: CreateCategoryDto) {
    // Thử insert với các trường mở rộng nếu có cột
    try {
      const res = await this.db.query(
        `INSERT INTO categories (name, description, image_url, status, sort_order) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          dto.name,
          dto.description || null,
          dto.image_url || null,
          dto.status || 'active',
          dto.sort_order || 0,
        ],
      );
      return res.rows[0];
    } catch (err) {
      // Fallback nếu schema gốc chỉ có (name, sort_order)
      const res = await this.db.query(
        `INSERT INTO categories (name, sort_order) 
         VALUES ($1, $2) 
         RETURNING *`,
        [dto.name, dto.sort_order || 0],
      );
      return res.rows[0];
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }
    if (dto.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(dto.sort_order);
    }

    if (fields.length === 0) return this.findOne(id);
    values.push(id);

    const res = await this.db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return res.rows[0];
  }

  async remove(id: number) {
    await this.db.query('UPDATE menu_items SET category_id = NULL WHERE category_id = $1', [id]);
    await this.db.query('DELETE FROM categories WHERE id = $1', [id]);
    return { success: true, message: `Deleted category #${id}` };
  }
}
