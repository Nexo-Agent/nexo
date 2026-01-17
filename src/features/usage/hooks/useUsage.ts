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
  type UsageChartPoint,
  type UsageStat,
} from '@/models/usage';
import { logger } from '@/lib/logger';

export interface UseUsageReturn {
  filter: UsageFilter;
  setFilter: (filter: UsageFilter) => void;
  summary: UsageSummary | null;
  chartData: UsageChartPoint[];
  logs: UsageStat[];
  loading: boolean;
  interval: string;
  setInterval: (interval: string) => void;
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
  const [chartData, setChartData] = useState<UsageChartPoint[]>([]);
  const [logs, setLogs] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState('day');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const summaryData = await invoke<UsageSummary>('get_usage_summary', {
        filter,
      });
      setSummary(summaryData);

      const chartDataRes = await invoke<UsageChartPoint[]>('get_usage_chart', {
        filter,
        interval,
      });
      setChartData(chartDataRes);

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
  }, [filter, interval, page]);

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
    chartData,
    logs,
    loading,
    interval,
    setInterval,
    page,
    setPage,
    LIMIT,
    handleClearUsage,
    refresh: fetchData,
  };
}
