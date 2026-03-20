class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.INFO;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (data) {
      return `${prefix} ${message} | Data: ${JSON.stringify(data)}`;
    }
    
    return `${prefix} ${message}`;
  }

  error(message, data = null) {
    if (this.currentLevel >= this.levels.ERROR) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message, data = null) {
    if (this.currentLevel >= this.levels.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message, data = null) {
    if (this.currentLevel >= this.levels.INFO) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  debug(message, data = null) {
    if (this.currentLevel >= this.levels.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  log(level, message, data = null) {
    switch (level) {
      case 'error':
        this.error(message, data);
        break;
      case 'warn':
        this.warn(message, data);
        break;
      case 'info':
        this.info(message, data);
        break;
      case 'debug':
        this.debug(message, data);
        break;
      default:
        this.info(message, data);
    }
  }

  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
  }

  createModuleLogger(moduleName) {
    return {
      error: (message, data) => this.error(`[${moduleName}] ${message}`, data),
      warn: (message, data) => this.warn(`[${moduleName}] ${message}`, data),
      info: (message, data) => this.info(`[${moduleName}] ${message}`, data),
      debug: (message, data) => this.debug(`[${moduleName}] ${message}`, data)
    };
  }
}

const logger = new Logger();
export default logger;
