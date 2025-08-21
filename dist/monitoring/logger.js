"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.createSessionLogger = createSessionLogger;
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function createLogger(logPath) {
    const logDir = logPath || '.cco/logs';
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: 'cco' },
        transports: [
            // Write all logs to combined.log
            new winston_1.default.transports.File({
                filename: path.join(logDir, 'combined.log'),
                maxsize: 10485760, // 10MB
                maxFiles: 5
            }),
            // Write errors to error.log
            new winston_1.default.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 10485760,
                maxFiles: 5
            })
        ]
    });
    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }));
    }
    return logger;
}
function createSessionLogger(sessionId, logPath) {
    const logDir = path.join(logPath || '.cco/logs', 'sessions');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'debug',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: 'cco', sessionId },
        transports: [
            new winston_1.default.transports.File({
                filename: path.join(logDir, `${sessionId}.log`),
                maxsize: 10485760,
                maxFiles: 3
            })
        ]
    });
}
//# sourceMappingURL=logger.js.map