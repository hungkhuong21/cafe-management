import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuItemsService implements OnModuleInit {
  private readonly logger = new Logger(MenuItemsService.name);

  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.initSchemaAndDefaultImages();
  }

  private async initSchemaAndDefaultImages() {
    try {
      // 1. Mở rộng cột image_url sang TEXT và đảm bảo các cột description, promo_price, show_on_qr tồn tại
      await this.db.query(`
        ALTER TABLE menu_items ALTER COLUMN image_url TYPE TEXT;
        ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,0);
        ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS show_on_qr BOOLEAN DEFAULT TRUE;
      `).catch(() => {});
      await this.db.query(`
        ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT;
      `).catch(() => {});

      // 2. Gán ảnh chuẩn chất lượng cao cho các món nếu chưa có hoặc ảnh file cục bộ /uploads bị mất
      const defaultImages: Record<string, string> = {
        'flan': 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=80',
        'que': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
        'tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
        'matcha': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
        'cookies': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
        'dưa hấu': 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&auto=format&fit=crop&q=80',
        'cam': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
        'xoài': 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&auto=format&fit=crop&q=80',
        'bơ': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
        'cà phê': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      };

      for (const [keyword, imgUrl] of Object.entries(defaultImages)) {
        await this.db.query(
          `UPDATE menu_items 
           SET image_url = $1 
           WHERE (image_url IS NULL OR image_url = '' OR image_url LIKE '/uploads/%' OR image_url LIKE 'http://localhost%') 
             AND LOWER(name) LIKE $2`,
          [imgUrl, `%${keyword}%`],
        );
      }
    } catch (err) {
      this.logger.warn('Ghi chú tự động đồng bộ ảnh món:', err);
    }
  }

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
    // Tự động kiểm tra và chèn các trường đầy đủ (kèm description, promo_price, show_on_qr)
    try {
      const res = await this.db.query(
        `INSERT INTO menu_items (name, category_id, price, promo_price, description, image_url, status, show_on_qr) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          dto.name,
          dto.category_id,
          dto.price,
          dto.promo_price ?? null,
          dto.description ?? null,
          dto.image_url || null,
          dto.status || 'available',
          dto.show_on_qr !== false,
        ],
      );
      return res.rows[0];
    } catch (err) {
      // Fallback
      const res = await this.db.query(
        `INSERT INTO menu_items (name, price, category_id, description, image_url) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [dto.name, dto.price, dto.category_id, dto.description || null, dto.image_url || null],
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
    if (dto.promo_price !== undefined) {
      fields.push(`promo_price = $${idx++}`);
      values.push(dto.promo_price);
    }
    if (dto.category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(dto.category_id);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(dto.image_url);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }
    if (dto.show_on_qr !== undefined) {
      fields.push(`show_on_qr = $${idx++}`);
      values.push(dto.show_on_qr);
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
