"use strict";
/**
 * Telemetry and metrics collection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryCollector = void 0;
exports.createTelemetryCollector = createTelemetryCollector;
const events_1 = require("events");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class TelemetryCollector extends events_1.EventEmitter {
    config;
    logger;
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    exportTimer;
    sessionStart;
    constructor(config, logger) {
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
    incrementCounter(name, value = 1, tags) {
        if (!this.config.enabled)
            return;
        const key = this.getMetricKey(name, tags);
        const existing = this.counters.get(key);
        if (existing) {
            existing.count += value;
        }
        else {
            this.counters.set(key, { name, count: value, tags });
        }
        this.emit('metric', { type: 'counter', name, value, tags });
    }
    /**
     * Record a gauge metric
     */
    setGauge(name, value, tags) {
        if (!this.config.enabled)
            return;
        const key = this.getMetricKey(name, tags);
        this.gauges.set(key, { name, value, tags });
        this.emit('metric', { type: 'gauge', name, value, tags });
    }
    /**
     * Record a histogram value
     */
    recordHistogram(name, value, tags) {
        if (!this.config.enabled)
            return;
        const key = this.getMetricKey(name, tags);
        if (!this.histograms.has(key)) {
            this.histograms.set(key, []);
        }
        this.histograms.get(key).push(value);
        this.emit('metric', { type: 'histogram', name, value, tags });
    }
    /**
     * Record a timing metric
     */
    recordTiming(name, duration, tags) {
        this.recordHistogram(`${name}.duration`, duration, tags);
    }
    /**
     * Start a timer for measuring duration
     */
    startTimer(name, tags) {
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
    trackApiCall(service, operation, success, duration, tokenUsage) {
        if (!this.config.enabled)
            return;
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
    trackMissionProgress(missionId, phase, iteration, completedTasks, totalTasks) {
        if (!this.config.enabled)
            return;
        const tags = { missionId, phase };
        this.setGauge('mission.iteration', iteration, tags);
        this.setGauge('mission.progress', (completedTasks / totalTasks) * 100, tags);
        this.setGauge('mission.completed_tasks', completedTasks, tags);
        this.setGauge('mission.total_tasks', totalTasks, tags);
    }
    /**
     * Track error metrics
     */
    trackError(error, context, recoverable) {
        if (!this.config.enabled)
            return;
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
    getSnapshot() {
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
    calculateHistogramStats() {
        const results = [];
        for (const [key, values] of this.histograms.entries()) {
            if (values.length === 0)
                continue;
            const sorted = [...values].sort((a, b) => a - b);
            const sum = sorted.reduce((a, b) => a + b, 0);
            const metric = {
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
    async exportMetrics() {
        if (!this.config.enabled)
            return;
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
            }
            catch (error) {
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
    async exportToOpenTelemetry(snapshot) {
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
    anonymizeSnapshot(snapshot) {
        // Remove or hash sensitive fields
        if (snapshot.counters) {
            snapshot.counters.forEach((counter) => {
                if (counter.tags?.missionId) {
                    counter.tags.missionId = this.hashString(counter.tags.missionId);
                }
            });
        }
    }
    /**
     * Start automatic export timer
     */
    startExportTimer() {
        this.exportTimer = setInterval(() => {
            this.exportMetrics().catch(error => {
                this.logger.error('Failed to export metrics', error);
            });
        }, this.config.exportInterval);
    }
    /**
     * Stop telemetry collection
     */
    async stop() {
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
    getMetricKey(name, tags) {
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
    parseMetricKey(key) {
        const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
        if (!match) {
            return { name: key };
        }
        const name = match[1];
        const tagStr = match[2];
        if (!tagStr) {
            return { name };
        }
        const tags = {};
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
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}
exports.TelemetryCollector = TelemetryCollector;
/**
 * Create telemetry collector with default config
 */
function createTelemetryCollector(logger, config) {
    const defaultConfig = {
        enabled: process.env.ENABLE_TELEMETRY === 'true',
        exportInterval: 60000, // 1 minute
        exportPath: process.env.TELEMETRY_EXPORT_PATH || '.cco/telemetry',
        anonymize: process.env.TELEMETRY_ANONYMIZE !== 'false',
        openTelemetryEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    };
    return new TelemetryCollector({ ...defaultConfig, ...config }, logger);
}
//# sourceMappingURL=telemetry.js.map