import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('health')
export class AppController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  async checkHealth() {
    const isDbConnected = await this.dbService.testConnection();
    return {
      status: 'ok',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}

