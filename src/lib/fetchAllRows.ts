import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

/**
 * Fetches all rows from a Supabase table, bypassing the 1000-row default limit.
 * Uses .range() to paginate through results in batches.
 */
export async function fetchAllRows<T>(
  table: TableName,
  options?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    batchSize?: number;
  }
): Promise<T[]> {
  const { select = '*', orderBy, ascending = true, batchSize = 1000 } = options || {};
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select).range(offset, offset + batchSize - 1);

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
