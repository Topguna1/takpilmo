import "./memory-manager.js";

export function installMemoryManager() {
  return {
    memoryManager: window.memoryManager || null,
    LogLevel: window.LogLevel || null,
  };
}

