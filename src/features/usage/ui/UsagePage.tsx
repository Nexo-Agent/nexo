import { UsageOverview } from './UsageOverview';
import { UsageLogs } from './UsageLogs';
import { useUsage } from '../hooks/useUsage';

export function UsagePage() {
  const { summary, logs, loading, page, setPage, LIMIT } = useUsage();

  return (
    <div className="space-y-8">
      <div
        className={`space-y-6 transition-opacity duration-300 ${
          loading ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <UsageOverview summary={summary} loading={loading} />

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
