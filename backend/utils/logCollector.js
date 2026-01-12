// 메모리 기반 로그 수집 시스템
class LogCollector {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.serverLogs = [];
    this.schedulerLogs = [];
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
  }

  addLog(type, level, message, ...args) {
    const timestamp = new Date().toISOString();
    const fullMessage = [message, ...args]
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    const logEntry = {
      timestamp,
      level,
      message: fullMessage,
      type
    };

    if (type === 'scheduler') {
      this.schedulerLogs.push(logEntry);
      if (this.schedulerLogs.length > this.maxSize) {
        this.schedulerLogs.shift();
      }
    } else {
      this.serverLogs.push(logEntry);
      if (this.serverLogs.length > this.maxSize) {
        this.serverLogs.shift();
      }
    }
  }

  getServerLogs(limit = 500) {
    const logs = this.serverLogs.slice(-limit);
    return logs.reverse(); // 최신 로그가 위로
  }

  getSchedulerLogs(limit = 500) {
    const logs = this.schedulerLogs.slice(-limit);
    return logs.reverse(); // 최신 로그가 위로
  }

  clearServerLogs() {
    this.serverLogs = [];
  }

  clearSchedulerLogs() {
    this.schedulerLogs = [];
  }

  // console.log 오버라이드
  interceptConsole() {
    const self = this;

    console.log = function(...args) {
      self.originalConsoleLog.apply(console, args);
      
      // 스케줄러 로그 구분
      const message = String(args[0] || '');
      if (message.includes('[scheduler]') || message.includes('scheduler:')) {
        self.addLog('scheduler', 'info', ...args);
      } else {
        self.addLog('server', 'info', ...args);
      }
    };

    console.error = function(...args) {
      self.originalConsoleError.apply(console, args);
      
      const message = String(args[0] || '');
      if (message.includes('[scheduler]') || message.includes('scheduler:')) {
        self.addLog('scheduler', 'error', ...args);
      } else {
        self.addLog('server', 'error', ...args);
      }
    };

    console.warn = function(...args) {
      self.originalConsoleWarn.apply(console, args);
      
      const message = String(args[0] || '');
      if (message.includes('[scheduler]') || message.includes('scheduler:')) {
        self.addLog('scheduler', 'warn', ...args);
      } else {
        self.addLog('server', 'warn', ...args);
      }
    };
  }
}

// 싱글톤 인스턴스
const logCollector = new LogCollector(1000);

module.exports = logCollector;

