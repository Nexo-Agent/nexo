/* eslint-disable no-console */
import * as Sentry from '@sentry/react';
import { trace, debug, info, warn, error } from '@tauri-apps/plugin-log';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

interface LogContext {
  workspaceId?: string;
  chatId?: string;
  userId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private context: LogContext = {};
  private level: LogLevel = import.meta.env.DEV
    ? LogLevel.DEBUG
    : LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitize(data: any): any {
    // Remove sensitive fields
    const sensitive = ['apiKey', 'api_key', 'password', 'token', 'secret'];
    if (typeof data === 'object' && data !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitized = { ...(data as any) };
      for (const key of sensitive) {
        if (key in sanitized) {
          sanitized[key] = '[REDACTED]';
        }
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Main logging method that integrates with tauri-plugin-log and Sentry
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const logData = {
      level: LogLevel[level],
      message,
      context: this.context,
      data: data ? this.sanitize(data) : undefined,
    };

    // Prepare message string for tauri-plugin-log (includes context/data if present)
    const formattedMessage = this.formatLogMessage(message, logData);

    // Console output in dev
    if (import.meta.env.DEV) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(`[${LogLevel[level]}] ${message}`, logData);
    }

    // Tauri Plugin Log (Backend & Webview Console)
    await this.callTauriLog(level, formattedMessage);

    // Sentry integration
    this.sendToSentry(level, message, logData);
  }

  private formatLogMessage(message: string, logData: any): string {
    const contextStr = Object.keys(logData.context).length
      ? ` | context: ${JSON.stringify(logData.context)}`
      : '';
    const dataStr = logData.data
      ? ` | data: ${JSON.stringify(logData.data)}`
      : '';
    return `${message}${contextStr}${dataStr}`;
  }

  private async callTauriLog(level: LogLevel, message: string) {
    try {
      switch (level) {
        case LogLevel.TRACE:
          await trace(message);
          break;
        case LogLevel.DEBUG:
          await debug(message);
          break;
        case LogLevel.INFO:
          await info(message);
          break;
        case LogLevel.WARN:
          await warn(message);
          break;
        case LogLevel.ERROR:
          await error(message);
          break;
      }
    } catch (e) {
      // Fallback in case plugin is not available (e.g. testing)
      if (import.meta.env.DEV) {
        console.warn('Tauri log plugin failed:', e);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendToSentry(level: LogLevel, message: string, logData: any) {
    // Sentry breadcrumb
    if (level >= LogLevel.WARN) {
      Sentry.addBreadcrumb({
        message,
        level: level === LogLevel.WARN ? 'warning' : 'error',
        data: logData,
      });
    }

    // Capture error in Sentry
    if (level === LogLevel.ERROR) {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: logData,
      });
    }
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.INFO:
        return console.info;
      default:
        return console.log;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace(message: string, data?: any) {
    this.log(LogLevel.TRACE, message, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }

  // No-op flushLogs for backward compatibility
  async flushLogs() {
    return Promise.resolve();
  }
}

export const logger = Logger.getInstance();
