import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;

  onModuleInit() {
    const connectionString = process.env.DATABASE_URL;

    this.pool = new Pool(
      connectionString
        ? { connectionString }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'cafe-management',
          },
    );

    this.pool.on('error', (err: Error) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const res = await client.query('SELECT NOW()');
      client.release();
      this.logger.log(`PostgreSQL connected successfully at: ${res.rows[0].now}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      return false;
    }
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const res = await this.pool.query<T>(text, params);
    const duration = Date.now() - start;
    this.logger.debug(`Executed query: { text: "${text}", duration: ${duration}ms }`);
    return res;
  }

  getPool(): Pool {
    return this.pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed.');
  }
}
