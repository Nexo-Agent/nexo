import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { UsageFilter } from '@/models/usage';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/ui/molecules/ConfirmDialog';
import { Button } from '@/ui/atoms/button';

interface UsageHeaderProps {
  filter: UsageFilter;
  onFilterChange: (filter: UsageFilter) => void;
  interval: string;
  onIntervalChange: (interval: string) => void;
  onClearUsage: () => void;
}

export function UsageHeader({
  filter,
  onFilterChange,
  interval,
  onIntervalChange,
  onClearUsage,
}: UsageHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 rounded-lg border bg-card">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={interval} onValueChange={onIntervalChange}>
              <SelectTrigger className="w-[110px] border-0 h-auto p-0 bg-transparent focus:ring-0">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-3 rounded-lg border bg-card">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              onValueChange={(val) => {
                const now = Math.floor(Date.now() / 1000);
                let from: number | undefined;
                switch (val) {
                  case '24h':
                    from = now - 86400;
                    break;
                  case '7d':
                    from = now - 7 * 86400;
                    break;
                  case '30d':
                    from = now - 30 * 86400;
                    break;
                  case 'all':
                    from = undefined;
                    break;
                }
                onFilterChange({
                  ...filter,
                  date_from: from,
                  date_to: undefined,
                });
              }}
              defaultValue="all"
            >
              <SelectTrigger className="w-[130px] border-0 h-auto p-0 bg-transparent focus:ring-0">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Clear Data
        </Button>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Are you absolutely sure?"
          description="This action cannot be undone. This will permanently delete all usage history and statistics."
          onConfirm={onClearUsage}
          confirmLabel="Delete"
          variant="destructive"
        />
      </div>
    </div>
  );
}
