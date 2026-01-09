export interface HubPrompt {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
}

export interface ParsedPromptTemplate {
  title: string;
  description: string;
  content: string;
  variables: string[];
}
