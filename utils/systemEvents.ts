import type { LogLevel } from '../types';

export interface SystemLogEvent {
  level: LogLevel;
  message: string;
}

type SystemLogListener = (event: SystemLogEvent) => void;

const systemLogListeners = new Set<SystemLogListener>();

export const emitSystemLog = (level: LogLevel, message: string): void => {
  const event = { level, message };
  systemLogListeners.forEach((listener) => listener(event));
};

export const subscribeSystemLog = (listener: SystemLogListener): (() => void) => {
  systemLogListeners.add(listener);
  return () => systemLogListeners.delete(listener);
};
