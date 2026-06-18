export interface Artifact {
  id: string;
  chat_id: string;
  message_id: string | null;
  tool_call_id: string | null;
  title: string;
  filename: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: number;
}

export interface ArtifactCreatedEvent {
  chat_id: string;
  artifact: Artifact;
}
