"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionSchema = exports.DoDCriteriaSchema = exports.DoDPriority = void 0;
const zod_1 = require("zod");
var DoDPriority;
(function (DoDPriority) {
    DoDPriority["CRITICAL"] = "critical";
    DoDPriority["HIGH"] = "high";
    DoDPriority["MEDIUM"] = "medium";
    DoDPriority["LOW"] = "low";
})(DoDPriority || (exports.DoDPriority = DoDPriority = {}));
exports.DoDCriteriaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    measurable: zod_1.z.boolean(),
    priority: zod_1.z.nativeEnum(DoDPriority),
    completed: zod_1.z.boolean().default(false),
    completedAt: zod_1.z.date().optional(),
    evidence: zod_1.z.string().optional()
});
exports.MissionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    repository: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    definitionOfDone: zod_1.z.array(exports.DoDCriteriaSchema),
    context: zod_1.z.string().optional(),
    constraints: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.date(),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional()
});
//# sourceMappingURL=mission.js.map