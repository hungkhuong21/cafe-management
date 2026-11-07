import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async findAll(onlyAvailable = false) {
    const query = onlyAvailable
      ? `SELECT m.*, 
                (m.status = 'available') as is_available,
                c.name as category_name 
         FROM menu_items m 
         LEFT JOIN categories c ON m.category_id = c.id 
         WHERE m.status = 'available' 
         ORDER BY m.id DESC`
      : `SELECT m.*, 
                (m.status = 'available') as is_available,
                c.name as category_name 
         FROM menu_items m 
         LEFT JOIN categories c ON m.category_id = c.id 
         ORDER BY m.id DESC`;
    const res = await this.db.query(query);
    return res.rows;
  }

  async findOne(id: number) {
    const res = await this.db.query(
      `SELECT m.*, 
              (m.status = 'available') as is_available,
              c.name as category_name 
       FROM menu_items m 
       LEFT JOIN categories c ON m.category_id = c.id 
       WHERE m.id = $1`,
      [id],
    );
    return res.rows[0];
  }

  async create(dto: CreateMenuItemDto) {
    // Tự động kiểm tra và chèn các trường
    try {
      const res = await this.db.query(
        `INSERT INTO menu_items (name, category_id, price, image_url, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          dto.name,
          dto.category_id,
          dto.price,
          dto.image_url || null,
          dto.status || 'available',
        ],
      );
      return res.rows[0];
    } catch (err) {
      // Fallback
      const res = await this.db.query(
        `INSERT INTO menu_items (name, price, category_id, image_url) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [dto.name, dto.price, dto.category_id, dto.image_url || null],
      );
      return res.rows[0];
    }
  }

  async update(id: number, dto: UpdateMenuItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(dto.price);
    }
    if (dto.category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(dto.category_id);
    }
    if (dto.image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(dto.image_url);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }

    if (fields.length === 0) return this.findOne(id);

    values.push(id);
    const res = await this.db.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return res.rows[0];
  }

  async remove(id: number) {
    await this.db.query('UPDATE order_items SET menu_item_id = NULL WHERE menu_item_id = $1', [id]);
    await this.db.query('DELETE FROM menu_items WHERE id = $1', [id]);
    return { success: true, message: `Deleted menu item #${id}` };
  }
}
