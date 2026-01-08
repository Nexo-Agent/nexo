import { UsageChartPoint } from '@/models/usage';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/atoms/card';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface UsageChartProps {
  data: UsageChartPoint[];
  loading?: boolean;
}

export function UsageChart({ data, loading }: UsageChartProps) {
  // Format timestamp for display
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.timestamp * 1000), 'MMM d, HH:mm'),
    dateMs: item.timestamp * 1000,
  }));

  return (
    <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-lg bg-gradient-to-b from-background via-background to-muted/30">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-chart-indigo to-chart-violet shadow-sm shadow-chart-indigo/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Usage Trend
            </span>
            <span className="text-xs font-medium text-muted-foreground/80">
              Input vs Output tokens over time
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-2 relative z-10">
        <div className="h-[350px] w-full mt-4">
          {loading ? (
            <div className="h-full w-full flex flex-col gap-2 items-center justify-center">
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted/50"
                  vertical={false}
                />
                <XAxis
                  dataKey="formattedDate"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow:
                      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontSize: '13px',
                  }}
                  itemStyle={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '2px 0',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                  }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm font-medium text-foreground ml-1">
                      {value}
                    </span>
                  )}
                />
                <Bar
                  dataKey="input_tokens"
                  name="Input Tokens"
                  fill="var(--chart-emerald)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  animationDuration={1500}
                />
                <Bar
                  dataKey="output_tokens"
                  name="Output Tokens"
                  fill="var(--chart-indigo)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="p-4 rounded-full bg-chart-indigo/10 dark:bg-chart-indigo/20">
                <TrendingUp className="h-8 w-8 text-chart-indigo" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No data available
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
