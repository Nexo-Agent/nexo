/**
 * Sentry utility functions for frontend tracking
 * Provides consistent patterns for tracking user actions and performance
 */

import {
  addBreadcrumb,
  captureException,
  captureMessage,
  setContext,
  setTag,
  setUser,
} from '@/lib/sentry';

/**
 * Track a user action with context
 */
export function trackUserAction(
  action: string,
  category: string,
  data?: Record<string, unknown>
) {
  addBreadcrumb({
    category: `user.${category}`,
    message: action,
    level: 'info',
    data: {
      ...data,
      timestamp: Date.now(),
    },
  });
}

/**
 * Track workspace context
 */
export function setWorkspaceContext(
  workspaceId: string,
  workspaceName?: string
) {
  setTag('workspace.id', workspaceId);
  if (workspaceName) {
    setContext('workspace', {
      id: workspaceId,
      name: workspaceName,
    });
  }
}

/**
 * Track chat context
 */
export function setChatContext(chatId: string, chatTitle?: string) {
  setTag('chat.id', chatId);
  if (chatTitle) {
    setContext('chat', {
      id: chatId,
      title: chatTitle,
    });
  }
}

/**
 * Track LLM provider context
 */
export function setLLMContext(provider: string, model: string) {
  setTag('llm.provider', provider);
  setTag('llm.model', model);
  setContext('llm', {
    provider,
    model,
  });
}

/**
 * Track API call performance
 */
export function trackAPICall(
  endpoint: string,
  method: string,
  duration: number,
  success: boolean,
  statusCode?: number
) {
  addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: success ? 'info' : 'error',
    data: {
      method,
      endpoint,
      duration,
      success,
      statusCode,
    },
  });

  // Track slow API calls
  if (duration > 3000) {
    captureMessage(`Slow API call: ${method} ${endpoint}`, {
      level: 'warning',
      extra: {
        duration,
        endpoint,
        method,
      },
    });
  }
}

/**
 * Track message send operation
 */
export function trackMessageSend(
  chatId: string,
  messageLength: number,
  hasAttachments: boolean
) {
  trackUserAction('Send message', 'chat', {
    chatId,
    messageLength,
    hasAttachments,
  });

  // Track long messages
  if (messageLength > 5000) {
    addBreadcrumb({
      category: 'chat.message',
      message: 'Long message sent',
      level: 'info',
      data: {
        messageLength,
      },
    });
  }
}

/**
 * Track streaming performance
 */
export function trackStreamingPerformance(
  chatId: string,
  totalDuration: number,
  chunkCount: number,
  tokenCount?: number
) {
  addBreadcrumb({
    category: 'chat.streaming',
    message: 'Streaming completed',
    level: 'info',
    data: {
      chatId,
      totalDuration,
      chunkCount,
      tokenCount,
      avgChunkTime: totalDuration / chunkCount,
    },
  });

  // Track slow streaming
  if (totalDuration > 30000) {
    captureMessage('Slow streaming response', {
      level: 'warning',
      extra: {
        chatId,
        totalDuration,
        chunkCount,
      },
    });
  }
}

/**
 * Track tool execution
 */
export function trackToolExecution(
  toolName: string,
  duration: number,
  success: boolean,
  error?: string
) {
  addBreadcrumb({
    category: 'mcp.tool',
    message: `Tool: ${toolName}`,
    level: success ? 'info' : 'error',
    data: {
      toolName,
      duration,
      success,
      error,
    },
  });

  if (!success && error) {
    captureMessage(`Tool execution failed: ${toolName}`, {
      level: 'error',
      extra: {
        toolName,
        error,
        duration,
      },
    });
  }
}

/**
 * Track workspace operations
 */
export function trackWorkspaceOperation(
  operation: 'create' | 'update' | 'delete' | 'switch',
  workspaceId: string
) {
  trackUserAction(`Workspace ${operation}`, 'workspace', {
    workspaceId,
    operation,
  });
}

/**
 * Track connection operations
 */
export function trackConnectionOperation(
  type: 'llm' | 'mcp',
  operation: 'create' | 'update' | 'delete' | 'test',
  connectionId: string,
  success: boolean,
  error?: string
) {
  trackUserAction(
    `${type.toUpperCase()} connection ${operation}`,
    'connection',
    {
      type,
      operation,
      connectionId,
      success,
      error,
    }
  );

  if (!success && error) {
    captureMessage(`Connection ${operation} failed`, {
      level: 'error',
      extra: {
        type,
        operation,
        connectionId,
        error,
      },
    });
  }
}

/**
 * Track component render performance
 */
export function trackComponentPerformance(
  componentName: string,
  renderTime: number,
  props?: Record<string, unknown>
) {
  // Only track slow renders
  if (renderTime > 100) {
    addBreadcrumb({
      category: 'ui.performance',
      message: `Slow render: ${componentName}`,
      level: 'warning',
      data: {
        componentName,
        renderTime,
        props,
      },
    });
  }
}

/**
 * Track navigation
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigate: ${from} → ${to}`,
    level: 'info',
    data: {
      from,
      to,
    },
  });
}

/**
 * Track file operations
 */
export function trackFileOperation(
  operation: 'upload' | 'download' | 'delete',
  fileType: string,
  fileSize?: number
) {
  trackUserAction(`File ${operation}`, 'file', {
    operation,
    fileType,
    fileSize,
  });
}

/**
 * Track agent operations
 */
export function trackAgentOperation(
  operation: 'install' | 'uninstall' | 'execute',
  agentId: string,
  success: boolean,
  error?: string
) {
  trackUserAction(`Agent ${operation}`, 'agent', {
    operation,
    agentId,
    success,
    error,
  });

  if (!success && error) {
    captureMessage(`Agent ${operation} failed`, {
      level: 'error',
      extra: {
        operation,
        agentId,
        error,
      },
    });
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  setUser(null);
  setTag('workspace.id', '');
  setTag('chat.id', '');
}

/**
 * Track error with context
 */
export function trackError(
  error: Error,
  context: {
    component?: string;
    action?: string;
    extra?: Record<string, unknown>;
  }
) {
  void captureException(error, {
    tags: {
      ...(context.component ? { component: context.component } : {}),
      ...(context.action ? { action: context.action } : {}),
    },
    contexts: context.extra
      ? {
          error_context: context.extra,
        }
      : undefined,
  });
}
