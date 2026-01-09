import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { UsageFilter } from '@/models/usage';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/ui/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/ui/atoms/dialog';

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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
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

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
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

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete all
                usage history and statistics.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={onClearUsage}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
