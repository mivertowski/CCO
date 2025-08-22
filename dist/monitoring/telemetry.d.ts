/**
 * Telemetry and metrics collection
 */
import { EventEmitter } from 'events';
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
    exportInterval: number;
    exportPath?: string;
    anonymize?: boolean;
    openTelemetryEndpoint?: string;
}
export declare class TelemetryCollector extends EventEmitter {
    private config;
    private logger;
    private counters;
    private gauges;
    private histograms;
    private exportTimer?;
    private sessionStart;
    constructor(config: TelemetryConfig, logger: EnhancedLogger);
    /**
     * Record a counter metric
     */
    incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Record a gauge metric
     */
    setGauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record a histogram value
     */
    recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record a timing metric
     */
    recordTiming(name: string, duration: number, tags?: Record<string, string>): void;
    /**
     * Start a timer for measuring duration
     */
    startTimer(name: string, tags?: Record<string, string>): () => void;
    /**
     * Track API call metrics
     */
    trackApiCall(service: string, operation: string, success: boolean, duration: number, tokenUsage?: {
        prompt: number;
        completion: number;
        total: number;
        cost: number;
    }): void;
    /**
     * Track mission progress
     */
    trackMissionProgress(missionId: string, phase: string, iteration: number, completedTasks: number, totalTasks: number): void;
    /**
     * Track error metrics
     */
    trackError(error: any, context: string, recoverable: boolean): void;
    /**
     * Get current metrics snapshot
     */
    getSnapshot(): any;
    /**
     * Calculate histogram statistics
     */
    private calculateHistogramStats;
    /**
     * Export metrics to file or endpoint
     */
    exportMetrics(): Promise<void>;
    /**
     * Export to OpenTelemetry collector
     */
    private exportToOpenTelemetry;
    /**
     * Anonymize sensitive data in snapshot
     */
    private anonymizeSnapshot;
    /**
     * Start automatic export timer
     */
    private startExportTimer;
    /**
     * Stop telemetry collection
     */
    stop(): Promise<void>;
    /**
     * Generate metric key from name and tags
     */
    private getMetricKey;
    /**
     * Parse metric key to extract name and tags
     */
    private parseMetricKey;
    /**
     * Simple hash function for anonymization
     */
    private hashString;
}
/**
 * Create telemetry collector with default config
 */
export declare function createTelemetryCollector(logger: EnhancedLogger, config?: Partial<TelemetryConfig>): TelemetryCollector;
//# sourceMappingURL=telemetry.d.ts.map