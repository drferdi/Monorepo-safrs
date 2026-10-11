export type DifyResponseMode = "streaming" | "blocking";

export interface DifyRetrieverResource {
  position: number;
  dataset_id: string;
  dataset_name: string;
  document_id: string;
  document_name: string;
  segment_id: string;
  score: number;
  content: string;
}

export interface DifyUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_price?: string;
  currency?: string;
  latency?: number;
}

export interface DifyAgentThought {
  id: string;
  task_id: string;
  message_id: string;
  position: number;
  thought: string;
  tool: string;
  tool_input: string;
  tool_labels_and_params?: unknown;
  thought_labels?: string[];
  observation: string;
  message_files?: string[];
  created_at: number;
}

export interface DifyMessageEndMetadata {
  usage?: DifyUsage;
  retriever_resources?: DifyRetrieverResource[];
}

export type DifyStreamEvent =
  | {
      event: "message";
      task_id: string;
      id: string;
      message_id: string;
      conversation_id: string;
      answer: string;
      created_at: number;
    }
  | {
      event: "agent_thought";
      id: string;
      task_id: string;
      message_id: string;
      position: number;
      thought: string;
      tool: string;
      tool_input: string;
      observation: string;
      message_files?: string[];
      created_at: number;
    }
  | {
      event: "agent_message";
      id: string;
      task_id: string;
      message_id: string;
      conversation_id?: string;
      answer: string;
      created_at: number;
    }
  | {
      event: "message_file";
      id: string;
      type: string;
      belongs_to: string;
      url: string;
      conversation_id: string;
    }
  | {
      event: "message_end";
      task_id: string;
      id: string;
      message_id: string;
      conversation_id: string;
      metadata: DifyMessageEndMetadata;
    }
  | {
      event: "message_replace";
      task_id: string;
      id: string;
      message_id: string;
      conversation_id: string;
      answer: string;
      created_at: number;
    }
  | {
      event: "error";
      task_id?: string;
      id?: string;
      status: number;
      code: string;
      message: string;
    }
  | {
      event: "ping";
    };

export interface DifyChatRequestBody {
  inputs?: Record<string, unknown>;
  query: string;
  response_mode?: DifyResponseMode;
  conversation_id?: string;
  user: string;
  files?: Array<{
    type: "image" | "document" | "audio" | "video";
    transfer_method: "remote_url" | "local_file";
    url?: string;
    upload_file_id?: string;
  }>;
  auto_generate_name?: boolean;
}

export interface DifyChatBlockingResponse {
  event?: "message";
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: string;
  answer: string;
  metadata: DifyMessageEndMetadata;
  created_at: number;
}

export interface DifyFeedbackRequest {
  rating: "like" | "dislike" | null;
  user: string;
  content?: string;
}

export interface DifyConversation {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  status: string;
  introduction: string;
  created_at: number;
  updated_at: number;
}

export interface DifyChatMessageHistory {
  id: string;
  conversation_id: string;
  inputs: Record<string, unknown>;
  query: string;
  answer: string;
  message_files: Array<{
    id: string;
    type: string;
    url: string;
    belongs_to: string;
  }>;
  feedback: {
    rating: "like" | "dislike" | null;
  } | null;
  retriever_resources?: DifyRetrieverResource[];
  created_at: number;
}

export interface DifyGatewayConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface DifyChatCallbacks {
  onChunk?: (chunk: string) => void;
  onThought?: (thought: DifyAgentThought) => void;
  onEnd?: (final: {
    answer: string;
    conversationId: string;
    messageId: string;
    metadata: DifyMessageEndMetadata;
  }) => void;
  onError?: (error: { code: string; message: string; status?: number }) => void;
  onResource?: (resources: DifyRetrieverResource[]) => void;
}
