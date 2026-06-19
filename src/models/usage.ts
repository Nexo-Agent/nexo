export interface UsageStat {
  id: string;
  workspace_id: string;
  chat_id: string;
  message_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost: number;
  timestamp: number;
  is_stream: boolean;
  status: string;
  request_type: string;
}

export interface UsageFilter {
  workspace_id?: string;
  start_date?: number;
  end_date?: number;
}

export interface UsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  total_requests: number;
  average_latency: number;
}
