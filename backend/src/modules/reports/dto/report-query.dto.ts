export class ReportQueryDto {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  groupBy?: 'day' | 'week' | 'month' | 'year';
  limit?: number;
}

