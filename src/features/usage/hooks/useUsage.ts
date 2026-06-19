import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppDispatch } from '@/app/hooks';
import {
  showSuccess,
  showError,
} from '@/features/notifications/state/notificationSlice';
import {
  type UsageFilter,
  type UsageSummary,
  type UsageStat,
} from '@/models/usage';
import { logger } from '@/lib/logger';

export interface UseUsageReturn {
  filter: UsageFilter;
  setFilter: (filter: UsageFilter) => void;
  summary: UsageSummary | null;
  logs: UsageStat[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  LIMIT: number;
  handleClearUsage: () => Promise<void>;
  refresh: () => void;
}

export function useUsage(): UseUsageReturn {
  const dispatch = useAppDispatch();

  const [filter, setFilter] = useState<UsageFilter>({});
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const summaryData = await invoke<UsageSummary>('get_usage_summary', {
        filter: {},
      });
      setSummary(summaryData);

      const logsRes = await invoke<UsageStat[]>('get_usage_logs', {
        filter,
        page,
        limit: LIMIT,
      });
      setLogs(logsRes);
    } catch (error) {
      logger.error('Failed to fetch usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearUsage = async () => {
    try {
      await invoke('clear_usage');
      dispatch(showSuccess('Usage data cleared successfully'));
      fetchData();
    } catch (error) {
      logger.error('Failed to clear usage data:', error);
      dispatch(showError('Failed to clear usage data'));
    }
  };

  return {
    filter,
    setFilter,
    summary,
    logs,
    loading,
    page,
    setPage,
    LIMIT,
    handleClearUsage,
    refresh: fetchData,
  };
}
