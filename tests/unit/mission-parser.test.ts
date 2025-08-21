import { describe, it, expect, beforeEach } from 'vitest';
import { MissionParser } from '../../src/core/mission-parser';
import { DoDPriority } from '../../src/models/mission';
import winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MissionParser', () => {
  let parser: MissionParser;
  let logger: winston.Logger;

  beforeEach(() => {
    logger = winston.createLogger({
      silent: true // Disable logging during tests
    });
    parser = new MissionParser(logger);
  });

  describe('parseMissionString', () => {
    it('should parse a valid YAML mission', () => {
      const yamlContent = `
mission:
  title: "Test Mission"
  repository: "./test-repo"
  description: "Test description"
  definition_of_done:
    - criteria: "Test criterion 1"
      measurable: true
      priority: critical
    - criteria: "Test criterion 2"
      measurable: false
      priority: high
  constraints:
    - "Constraint 1"
    - "Constraint 2"
  context: "Test context"
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');

      expect(mission.title).toBe('Test Mission');
      expect(mission.repository).toContain('test-repo');
      expect(mission.description).toBe('Test description');
      expect(mission.definitionOfDone).toHaveLength(2);
      expect(mission.definitionOfDone[0].priority).toBe(DoDPriority.CRITICAL);
      expect(mission.definitionOfDone[1].priority).toBe(DoDPriority.HIGH);
      expect(mission.constraints).toEqual(['Constraint 1', 'Constraint 2']);
      expect(mission.context).toBe('Test context');
    });

    it('should parse a valid JSON mission', () => {
      const jsonContent = JSON.stringify({
        mission: {
          title: "JSON Test Mission",
          repository: "./json-repo",
          description: "JSON test description",
          definition_of_done: [
            {
              criteria: "JSON criterion",
              measurable: true,
              priority: "medium"
            }
          ]
        }
      });

      const mission = parser.parseMissionString(jsonContent, 'json');

      expect(mission.title).toBe('JSON Test Mission');
      expect(mission.repository).toContain('json-repo');
      expect(mission.definitionOfDone).toHaveLength(1);
      expect(mission.definitionOfDone[0].priority).toBe(DoDPriority.MEDIUM);
    });

    it('should handle missing optional fields', () => {
      const yamlContent = `
mission:
  title: "Minimal Mission"
  repository: "./minimal-repo"
  description: "Minimal description"
  definition_of_done:
    - criteria: "Single criterion"
      priority: critical
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');

      expect(mission.title).toBe('Minimal Mission');
      expect(mission.constraints).toBeUndefined();
      expect(mission.context).toBeUndefined();
      expect(mission.definitionOfDone[0].measurable).toBe(true); // Default value
    });

    it('should normalize repository paths', () => {
      const yamlContent = `
mission:
  title: "Path Test"
  repository: "./relative/path"
  description: "Testing path normalization"
  definition_of_done:
    - criteria: "Test"
      priority: high
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');

      expect(path.isAbsolute(mission.repository)).toBe(true);
      expect(mission.repository).toContain('relative');
      expect(mission.repository).toContain('path');
    });

    it('should throw error for invalid priority', () => {
      const yamlContent = `
mission:
  title: "Invalid Priority Test"
  repository: "./test"
  description: "Test"
  definition_of_done:
    - criteria: "Test"
      priority: invalid_priority
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');
      // Should default to MEDIUM for unknown priority
      expect(mission.definitionOfDone[0].priority).toBe(DoDPriority.MEDIUM);
    });
  });

  describe('validateMission', () => {
    it('should validate a complete mission', () => {
      const yamlContent = `
mission:
  title: "Valid Mission"
  repository: "./valid-repo"
  description: "Valid description"
  definition_of_done:
    - criteria: "Valid criterion"
      measurable: true
      priority: critical
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');
      const validation = parser.validateMission(mission);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should detect missing title', () => {
      const mission = {
        id: 'test-id',
        title: '',
        repository: './repo',
        description: 'desc',
        definitionOfDone: [{
          id: 'dod-1',
          description: 'test',
          measurable: true,
          priority: DoDPriority.HIGH,
          completed: false
        }],
        createdAt: new Date()
      };

      const validation = parser.validateMission(mission);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Mission title is required');
    });

    it('should detect missing DoD criteria', () => {
      const mission = {
        id: 'test-id',
        title: 'Test',
        repository: './repo',
        description: 'desc',
        definitionOfDone: [],
        createdAt: new Date()
      };

      const validation = parser.validateMission(mission);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one Definition of Done criterion is required');
    });

    it('should warn about missing critical criteria', () => {
      const yamlContent = `
mission:
  title: "No Critical"
  repository: "./repo"
  description: "desc"
  definition_of_done:
    - criteria: "Medium priority only"
      priority: medium
      `;

      const mission = parser.parseMissionString(yamlContent, 'yaml');
      const validation = parser.validateMission(mission);

      expect(validation.valid).toBe(true); // Still valid, just a warning
    });
  });

  describe('exportMission', () => {
    it('should export mission to YAML format', () => {
      const mission = {
        id: 'test-id',
        title: 'Export Test',
        repository: './export-repo',
        description: 'Export description',
        definitionOfDone: [{
          id: 'dod-1',
          description: 'Export criterion',
          measurable: true,
          priority: DoDPriority.HIGH,
          completed: false
        }],
        constraints: ['Constraint 1'],
        context: 'Export context',
        createdAt: new Date()
      };

      const yamlExport = parser.exportMission(mission, 'yaml');

      expect(yamlExport).toContain('title: Export Test');
      expect(yamlExport).toContain('repository: ./export-repo');
      expect(yamlExport).toContain('criteria: Export criterion');
      expect(yamlExport).toContain('priority: high');
    });

    it('should export mission to JSON format', () => {
      const mission = {
        id: 'test-id',
        title: 'JSON Export Test',
        repository: './json-export',
        description: 'JSON export description',
        definitionOfDone: [{
          id: 'dod-1',
          description: 'JSON criterion',
          measurable: false,
          priority: DoDPriority.LOW,
          completed: false
        }],
        createdAt: new Date()
      };

      const jsonExport = parser.exportMission(mission, 'json');
      const parsed = JSON.parse(jsonExport);

      expect(parsed.mission.title).toBe('JSON Export Test');
      expect(parsed.mission.repository).toBe('./json-export');
      expect(parsed.mission.definition_of_done[0].criteria).toBe('JSON criterion');
      expect(parsed.mission.definition_of_done[0].priority).toBe('low');
    });
  });
});