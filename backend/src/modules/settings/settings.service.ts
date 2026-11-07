import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async getSettings() {
    // Đảm bảo luôn tồn tại bản ghi id = 1
    await this.db.query(`
      INSERT INTO store_settings (id, name, branch, address, phone, website, logo_url)
      VALUES (1, 'CafeFlow', 'Nguyễn Huệ • HCM', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '028 1234 5678', 'cafeflow.vn', NULL)
      ON CONFLICT (id) DO NOTHING;
    `);

    const res = await this.db.query(`
      SELECT id, name, branch, address, phone, website, logo_url
      FROM store_settings
      WHERE id = 1
      LIMIT 1;
    `);

    return res.rows[0];
  }

  async updateSettings(dto: UpdateSettingsDto) {
    // Đảm bảo record tồn tại
    await this.getSettings();

    const res = await this.db.query(
      `
      UPDATE store_settings
      SET 
        name = COALESCE($1, name),
        branch = COALESCE($2, branch),
        address = COALESCE($3, address),
        phone = COALESCE($4, phone),
        website = COALESCE($5, website),
        logo_url = $6
      WHERE id = 1
      RETURNING id, name, branch, address, phone, website, logo_url;
      `,
      [
        dto.name ?? null,
        dto.branch ?? null,
        dto.address ?? null,
        dto.phone ?? null,
        dto.website ?? null,
        dto.logo_url !== undefined ? dto.logo_url : null,
      ],
    );

    return res.rows[0];
  }
}

