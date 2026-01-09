import { UsageHeader } from './UsageHeader';
import { UsageOverview } from './UsageOverview';
import { UsageChart } from './UsageChart';
import { UsageLogs } from './UsageLogs';
import { useUsage } from '../hooks/useUsage';

export function UsagePage() {
  const {
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
  } = useUsage();

  return (
    <div className="space-y-8">
      <UsageHeader
        filter={filter}
        onFilterChange={setFilter}
        interval={interval}
        onIntervalChange={setInterval}
        onClearUsage={handleClearUsage}
      />

      <div
        className={`space-y-6 transition-opacity duration-300 ${
          loading ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {summary && <UsageOverview summary={summary} loading={loading} />}

        <UsageChart data={chartData} loading={loading} />

        <UsageLogs
          logs={logs}
          page={page}
          limit={LIMIT}
          onPageChange={setPage}
          hasMore={logs.length === LIMIT}
          loading={loading}
        />
      </div>
    </div>
  );
}
