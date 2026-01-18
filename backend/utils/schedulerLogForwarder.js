const http = require('http');
const https = require('https');

function formatMessage(args) {
  return args
    .map((arg) => {
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
}

function sendSchedulerLog(level, args) {
  const ingestUrl = process.env.SCHEDULER_LOG_INGEST_URL;
  if (!ingestUrl) return;

  let url;
  try {
    url = new URL(ingestUrl);
  } catch {
    return;
  }

  const message = formatMessage(args);
  if (!message) return;

  const payload = JSON.stringify({ level, message });
  const transport = url.protocol === 'https:' ? https : http;
  const req = transport.request(
    {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search || ''}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 3000,
    },
    (res) => {
      res.resume();
    }
  );

  req.on('error', () => {
    // 전송 실패는 무시 (스케줄러 로직에 영향 주지 않음)
  });
  req.on('timeout', () => {
    req.destroy();
  });

  req.write(payload);
  req.end();
}

function forwardSchedulerConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const shouldForward = (args) => {
    const message = String(args[0] || '');
    return (
      message.includes('[scheduler]') ||
      message.includes('[스케줄러]') ||
      message.includes('scheduler:')
    );
  };

  console.log = (...args) => {
    originalLog(...args);
    if (shouldForward(args)) {
      sendSchedulerLog('info', args);
    }
  };

  console.error = (...args) => {
    originalError(...args);
    if (shouldForward(args)) {
      sendSchedulerLog('error', args);
    }
  };

  console.warn = (...args) => {
    originalWarn(...args);
    if (shouldForward(args)) {
      sendSchedulerLog('warn', args);
    }
  };
}

module.exports = {
  forwardSchedulerConsole,
};


