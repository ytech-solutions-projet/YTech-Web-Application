import logger from './logger';

class RealtimeService {
  constructor() {
    this.listeners = new Map();
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.logger = logger.createModuleLogger('RealtimeService');
  }

  init() {
    if (this.isInitialized) {
      this.logger.warn('Realtime service already initialized');
      return;
    }

    try {
      this.setupEventListeners();
      this.isInitialized = true;
      this.logger.info('Realtime service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize realtime service', error);
    }
  }

  setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
      window.addEventListener('message', this.handleWindowMessage.bind(this));
    }
  }

  handleStorageEvent(event) {
    if (event.key === 'realtime_event') {
      try {
        const eventData = JSON.parse(event.newValue);
        this.emit(eventData.type, eventData.payload);
      } catch (error) {
        this.logger.error('Error parsing storage event', error);
      }
    }
  }

  handleWindowMessage(event) {
    if (event.data && event.data.type === 'realtime_event') {
      this.emit(event.data.eventType, event.data.payload);
    }
  }

  emit(eventType, payload) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          this.logger.error(`Error in event listener for ${eventType}`, error);
        }
      });
    }

    // Store in localStorage for cross-tab communication
    this.storeEvent(eventType, payload);
  }

  storeEvent(eventType, payload) {
    try {
      const eventData = {
        type: eventType,
        payload,
        timestamp: Date.now()
      };
      localStorage.setItem('realtime_event', JSON.stringify(eventData));
      
      // Clean up after a short delay
      setTimeout(() => {
        localStorage.removeItem('realtime_event');
      }, 100);
    } catch (error) {
      this.logger.error('Error storing event in localStorage', error);
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  off(eventType, callback) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners && callback) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    } else if (eventType) {
      this.listeners.delete(eventType);
    }
  }

  once(eventType, callback) {
    const onceCallback = (payload) => {
      callback(payload);
      this.off(eventType, onceCallback);
    };
    
    return this.on(eventType, onceCallback);
  }

  emitToAllWindows(eventType, payload) {
    // Emit to current window
    this.emit(eventType, payload);
    
    // Emit to other windows via postMessage
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'realtime_event',
        eventType,
        payload
      }, '*');
    }
  }

  getListenerCount(eventType) {
    const eventListeners = this.listeners.get(eventType);
    return eventListeners ? eventListeners.size : 0;
  }

  getAllEventTypes() {
    return Array.from(this.listeners.keys());
  }

  clear() {
    this.listeners.clear();
    this.logger.info('All event listeners cleared');
  }

  destroy() {
    this.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
      window.removeEventListener('message', this.handleWindowMessage.bind(this));
    }
    
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.logger.info('Realtime service destroyed');
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      try {
        this.destroy();
        this.init();
        this.reconnectAttempts = 0;
        this.logger.info('Reconnection successful');
      } catch (error) {
        this.logger.error('Reconnection failed', error);
        this.reconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      listenerCount: this.listeners.size,
      eventTypes: this.getAllEventTypes(),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;
