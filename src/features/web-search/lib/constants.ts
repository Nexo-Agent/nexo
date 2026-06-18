export const WEB_SEARCH_KEYS = {
  TAVILY_API_KEY: 'web_search.tavily.api_key',
  EXA_API_KEY: 'web_search.exa.api_key',
  PROVIDER: 'web_search.provider',
} as const;

export const WEB_SEARCH_PROVIDERS = ['tavily', 'exa'] as const;
export type WebSearchProvider = (typeof WEB_SEARCH_PROVIDERS)[number];

export const DEFAULT_WEB_SEARCH_PROVIDER: WebSearchProvider = 'tavily';

export const WEB_SEARCH_DASHBOARD_URLS = {
  tavily: 'https://app.tavily.com/home',
  exa: 'https://dashboard.exa.ai/api-keys',
} as const;
