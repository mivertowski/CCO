/**
 * Telemetry and metrics collection
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EnhancedLogger } from './logger';

export interface MetricEvent {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface CounterMetric {
  name: string;
  count: number;
  tags?: Record<string, string>;
}

export interface GaugeMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface HistogramMetric {
  name: string;
  values: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  tags?: Record<string, string>;
}

export interface TelemetryConfig {
  enabled: boolean;
  exportInterval: number; // milliseconds
  exportPath?: string;
  anonymize?: boolean;
  openTelemetryEndpoint?: string;
}

export class TelemetryCollector extends EventEmitter {
  private config: TelemetryConfig;
  private logger: EnhancedLogger;
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private exportTimer?: NodeJS.Timeout;
  private sessionStart: Date;
  
  constructor(config: TelemetryConfig, logger: EnhancedLogger) {
    super();
    this.config = config;
    this.logger = logger;
    this.sessionStart = new Date();
    
    if (config.enabled && config.exportInterval > 0) {
      this.startExportTimer();
    }
  }
  
  /**
   * Record a counter metric
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, tags);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing.count += value;
    } else {
      this.counters.set(key, { name, count: value, tags });
    }
    
    this.emit('metric', { type: 'counter', name, value, tags });
  }
  
  /**
   * Record a gauge metric
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, { name, value, tags });
    
    this.emit('metric', { type: 'gauge', name, value, tags });
  }
  
  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, tags);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    
    this.histograms.get(key)!.push(value);
    
    this.emit('metric', { type: 'histogram', name, value, tags });
  }
  
  /**
   * Record a timing metric
   */
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordHistogram(`${name}.duration`, duration, tags);
  }
  
  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordTiming(name, duration, tags);
      return duration;
    };
  }
  
  /**
   * Track API call metrics
   */
  trackApiCall(
    service: string,
    operation: string,
    success: boolean,
    duration: number,
    tokenUsage?: { prompt: number; completion: number; total: number; cost: number }
  ): void {
    if (!this.config.enabled) return;
    
    const tags = { service, operation, success: success.toString() };
    
    this.incrementCounter('api.calls', 1, tags);
    this.recordTiming('api.call', duration, tags);
    
    if (tokenUsage) {
      this.incrementCounter('tokens.prompt', tokenUsage.prompt, { service });
      this.incrementCounter('tokens.completion', tokenUsage.completion, { service });
      this.incrementCounter('tokens.total', tokenUsage.total, { service });
      this.setGauge('tokens.cost', tokenUsage.cost, { service });
    }
    
    if (!success) {
      this.incrementCounter('api.errors', 1, tags);
    }
  }
  
  /**
   * Track mission progress
   */
  trackMissionProgress(
    missionId: string,
    phase: string,
    iteration: number,
    completedTasks: number,
    totalTasks: number
  ): void {
    if (!this.config.enabled) return;
    
    const tags = { missionId, phase };
    
    this.setGauge('mission.iteration', iteration, tags);
    this.setGauge('mission.progress', (completedTasks / totalTasks) * 100, tags);
    this.setGauge('mission.completed_tasks', completedTasks, tags);
    this.setGauge('mission.total_tasks', totalTasks, tags);
  }
  
  /**
   * Track error metrics
   */
  trackError(error: any, context: string, recoverable: boolean): void {
    if (!this.config.enabled) return;
    
    const errorType = error?.constructor?.name || 'UnknownError';
    const tags = { 
      context, 
      errorType, 
      recoverable: recoverable.toString() 
    };
    
    this.incrementCounter('errors', 1, tags);
    
    if (error?.code) {
      this.incrementCounter('errors.by_code', 1, { code: error.code, context });
    }
  }
  
  /**
   * Get current metrics snapshot
   */
  getSnapshot(): any {
    const uptime = Date.now() - this.sessionStart.getTime();
    
    return {
      timestamp: new Date(),
      uptime,
      counters: Array.from(this.counters.values()),
      gauges: Array.from(this.gauges.values()),
      histograms: this.calculateHistogramStats()
    };
  }
  
  /**
   * Calculate histogram statistics
   */
  private calculateHistogramStats(): HistogramMetric[] {
    const results: HistogramMetric[] = [];
    
    for (const [key, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      const metric: HistogramMetric = {
        name: key,
        values: sorted,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sum / sorted.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        tags: this.parseMetricKey(key).tags
      };
      
      results.push(metric);
    }
    
    return results;
  }
  
  /**
   * Export metrics to file or endpoint
   */
  async exportMetrics(): Promise<void> {
    if (!this.config.enabled) return;
    
    const snapshot = this.getSnapshot();
    
    // Anonymize if configured
    if (this.config.anonymize) {
      this.anonymizeSnapshot(snapshot);
    }
    
    // Export to file
    if (this.config.exportPath) {
      try {
        const exportPath = path.join(this.config.exportPath, `metrics-${Date.now()}.json`);
        await fs.writeFile(exportPath, JSON.stringify(snapshot, null, 2));
        this.logger.debug('Metrics exported to file', { path: exportPath });
      } catch (error) {
        this.logger.error('Failed to export metrics to file', error);
      }
    }
    
    // Export to OpenTelemetry endpoint if configured
    if (this.config.openTelemetryEndpoint) {
      await this.exportToOpenTelemetry(snapshot);
    }
    
    this.emit('export', snapshot);
  }
  
  /**
   * Export to OpenTelemetry collector
   */
  private async exportToOpenTelemetry(snapshot: any): Promise<void> {
    // This would integrate with OpenTelemetry SDK
    // Placeholder for actual implementation
    this.logger.debug('OpenTelemetry export', { 
      endpoint: this.config.openTelemetryEndpoint,
      metrics: snapshot 
    });
  }
  
  /**
   * Anonymize sensitive data in snapshot
   */
  private anonymizeSnapshot(snapshot: any): void {
    // Remove or hash sensitive fields
    if (snapshot.counters) {
      snapshot.counters.forEach((counter: any) => {
        if (counter.tags?.missionId) {
          counter.tags.missionId = this.hashString(counter.tags.missionId);
        }
      });
    }
  }
  
  /**
   * Start automatic export timer
   */
  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      this.exportMetrics().catch(error => {
        this.logger.error('Failed to export metrics', error);
      });
    }, this.config.exportInterval);
  }
  
  /**
   * Stop telemetry collection
   */
  async stop(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = undefined;
    }
    
    // Final export
    await this.exportMetrics();
    
    this.removeAllListeners();
  }
  
  /**
   * Generate metric key from name and tags
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return `${name}{${tagStr}}`;
  }
  
  /**
   * Parse metric key to extract name and tags
   */
  private parseMetricKey(key: string): { name: string; tags?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {
      return { name: key };
    }
    
    const name = match[1];
    const tagStr = match[2];
    
    if (!tagStr) {
      return { name };
    }
    
    const tags: Record<string, string> = {};
    tagStr.split(',').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) {
        tags[k] = v;
      }
    });
    
    return { name, tags };
  }
  
  /**
   * Simple hash function for anonymization
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

/**
 * Create telemetry collector with default config
 */
export function createTelemetryCollector(
  logger: EnhancedLogger,
  config?: Partial<TelemetryConfig>
): TelemetryCollector {
  const defaultConfig: TelemetryConfig = {
    enabled: process.env.ENABLE_TELEMETRY === 'true',
    exportInterval: 60000, // 1 minute
    exportPath: process.env.TELEMETRY_EXPORT_PATH || '.cco/telemetry',
    anonymize: process.env.TELEMETRY_ANONYMIZE !== 'false',
    openTelemetryEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  };
  
  return new TelemetryCollector(
    { ...defaultConfig, ...config },
    logger
  );
}