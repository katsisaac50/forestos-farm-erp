#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const VALID_PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set(["open", "in_progress", "blocked", "completed", "cancelled"]);
const VALID_TYPES = new Set(["tree_mortality", "gap_replanting", "weeding", "firebreak", "pest_disease", "pruning", "soil_water", "apiary_inspection", "hive_repair", "harvest", "other"]);

function nonEmptyString(v) { return typeof v === "string" && v.trim().length > 0; }
function isoDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function buildOperationsReport(input = {}, options = {}) {
  const errors = [], warnings = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { schemaVersion: "1.0", phase: 140, status: "invalid_input", errors: ["Input must be a JSON object"], warnings: [], summary: {}, inspections: [], tasks: [], escalations: [] };
  }
  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("options.now must be a valid date");
  const today = now.toISOString().slice(0, 10);
  const inspectionsInput = input.inspections === undefined ? [] : input.inspections;
  const tasksInput = input.tasks === undefined ? [] : input.tasks;
  if (!Array.isArray(inspectionsInput)) errors.push("inspections must be an array");
  if (!Array.isArray(tasksInput)) errors.push("tasks must be an array");
  const inspectionIds = new Set(), taskIds = new Set();

  const inspections = (Array.isArray(inspectionsInput) ? inspectionsInput : []).map((raw, index) => {
    const row = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const id = nonEmptyString(row.id) ? row.id.trim() : `inspection-${index + 1}`;
    const area = nonEmptyString(row.area) ? row.area.trim() : "";
    const date = row.date;
    const inspector = nonEmptyString(row.inspector) ? row.inspector.trim() : "";
    const issueCount = row.issueCount === undefined ? 0 : row.issueCount;
    const severity = row.severity === undefined ? "low" : row.severity;
    const followUpRequired = row.followUpRequired === undefined ? false : row.followUpRequired;
    if (!area) errors.push(`inspections[${index}].area is required`);
    if (!isoDate(date)) errors.push(`inspections[${index}].date must be YYYY-MM-DD`);
    if (!inspector) errors.push(`inspections[${index}].inspector is required`);
    if (!Number.isInteger(issueCount) || issueCount < 0) errors.push(`inspections[${index}].issueCount must be a non-negative integer`);
    if (!VALID_PRIORITIES.has(severity)) errors.push(`inspections[${index}].severity must be low, medium, high, or critical`);
    if (typeof followUpRequired !== "boolean") errors.push(`inspections[${index}].followUpRequired must be boolean`);
    if (inspectionIds.has(id)) errors.push(`Duplicate inspection id: ${id}`);
    inspectionIds.add(id);
    const notes = typeof row.notes === "string" ? row.notes.trim() : "";
    return { id, area, date: typeof date === "string" ? date : "", inspector, issueCount: Number.isInteger(issueCount) && issueCount >= 0 ? issueCount : 0, severity: VALID_PRIORITIES.has(severity) ? severity : "low", followUpRequired: followUpRequired === true, notes };
  });

  const tasks = (Array.isArray(tasksInput) ? tasksInput : []).map((raw, index) => {
    const row = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const id = nonEmptyString(row.id) ? row.id.trim() : `task-${index + 1}`;
    const area = nonEmptyString(row.area) ? row.area.trim() : "";
    const type = row.type === undefined ? "other" : row.type;
    const title = nonEmptyString(row.title) ? row.title.trim() : "";
    const owner = nonEmptyString(row.owner) ? row.owner.trim() : "";
    const dueDate = row.dueDate;
    const priority = row.priority === undefined ? "medium" : row.priority;
    const status = row.status === undefined ? "open" : row.status;
    const evidence = Array.isArray(row.evidence) ? row.evidence.filter(nonEmptyString).map(x => x.trim()) : [];
    if (!area) errors.push(`tasks[${index}].area is required`);
    if (!VALID_TYPES.has(type)) errors.push(`tasks[${index}].type is invalid`);
    if (!title) errors.push(`tasks[${index}].title is required`);
    if (!owner) errors.push(`tasks[${index}].owner is required`);
    if (!isoDate(dueDate)) errors.push(`tasks[${index}].dueDate must be YYYY-MM-DD`);
    if (!VALID_PRIORITIES.has(priority)) errors.push(`tasks[${index}].priority is invalid`);
    if (!VALID_STATUSES.has(status)) errors.push(`tasks[${index}].status is invalid`);
    if (row.evidence !== undefined && !Array.isArray(row.evidence)) errors.push(`tasks[${index}].evidence must be an array`);
    if (taskIds.has(id)) errors.push(`Duplicate task id: ${id}`);
    taskIds.add(id);
    const validStatus = VALID_STATUSES.has(status) ? status : "open";
    const overdue = isoDate(dueDate) && dueDate < today && !["completed", "cancelled"].includes(validStatus);
    return { id, area, type: VALID_TYPES.has(type) ? type : "other", title, owner, dueDate: typeof dueDate === "string" ? dueDate : "", priority: VALID_PRIORITIES.has(priority) ? priority : "medium", status: validStatus, overdue, evidence };
  });

  const openTasks = tasks.filter(t => !["completed", "cancelled"].includes(t.status));
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = openTasks.filter(t => t.overdue);
  const blockedTasks = tasks.filter(t => t.status === "blocked");
  const criticalOpenTasks = openTasks.filter(t => ["critical", "high"].includes(t.priority));
  const followUps = inspections.filter(i => i.followUpRequired || i.issueCount > 0 || ["high", "critical"].includes(i.severity));
  const escalations = [];
  for (const task of overdueTasks) escalations.push({ level: task.priority === "critical" ? "critical" : "high", sourceType: "task", sourceId: task.id, area: task.area, owner: task.owner, message: `Task "${task.title}" is overdue (due ${task.dueDate}).` });
  for (const task of blockedTasks) escalations.push({ level: task.priority === "critical" ? "critical" : "medium", sourceType: "task", sourceId: task.id, area: task.area, owner: task.owner, message: `Task "${task.title}" is blocked and needs an unblock plan.` });
  for (const inspection of followUps) escalations.push({ level: inspection.severity, sourceType: "inspection", sourceId: inspection.id, area: inspection.area, owner: inspection.inspector, message: `Inspection ${inspection.id} has ${inspection.issueCount} issue(s) and requires follow-up review.` });

  const recommendations = [];
  if (overdueTasks.length) recommendations.push({ priority: "high", action: "Review overdue work with each owner, agree a completion date, and document any dependency." });
  if (blockedTasks.length) recommendations.push({ priority: "high", action: "Record the blocker, assign a person to resolve it, and set a review date." });
  if (followUps.length) recommendations.push({ priority: "high", action: "Triage inspection findings by severity; record corrective actions and verify closure in the field." });
  if (tasks.some(t => t.status === "completed" && t.evidence.length === 0)) recommendations.push({ priority: "medium", action: "Add completion evidence to closed tasks where appropriate (for example, a dated checklist or permitted photo reference)." });
  if (!recommendations.length) recommendations.push({ priority: "low", action: "Continue scheduled inspections and keep task owners, due dates, and completion evidence current." });

  return {
    schemaVersion: "1.0", phase: 140, generatedAt: now.toISOString(),
    status: errors.length ? "invalid_input" : "ok", errors, warnings,
    summary: {
      inspectionCount: inspections.length,
      inspectionsWithFollowUp: followUps.length,
      inspectionIssues: inspections.reduce((sum, x) => sum + x.issueCount, 0),
      taskCount: tasks.length,
      openTasks: openTasks.length,
      inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
      blockedTasks: blockedTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      highOrCriticalOpenTasks: criticalOpenTasks.length,
      taskCompletionPct: tasks.length ? Math.round((completedTasks.length / tasks.length) * 10000) / 100 : null
    },
    inspections, tasks, escalations, recommendations,
    limitations: [
      "This report uses only supplied JSON; it does not store records, notify owners, authenticate users, or sync to a server.",
      "Inspection records and completion evidence are not independently verified; use approved farm procedures for safety-critical work.",
      "Overdue status is computed from the supplied report date and due dates; confirm timezone and field reporting practices before operational decisions."
    ]
  };
}
function main(argv) {
  const args = argv.slice(2), inputArg = args.find(x => x.startsWith("--input=")), outputArg = args.find(x => x.startsWith("--output=")), nowArg = args.find(x => x.startsWith("--now="));
  if (!inputArg) { console.error("Usage: node scripts/phase140-farm-operations-inspections.js --input=records.json [--output=report.json] [--now=2026-10-28]"); process.exitCode = 2; return; }
  let input;
  try { input = JSON.parse(fs.readFileSync(path.resolve(inputArg.slice(8)), "utf8")); }
  catch (e) { console.error(`Unable to read input JSON: ${e.message}`); process.exitCode = 2; return; }
  const report = buildOperationsReport(input, nowArg ? { now: nowArg.slice(6) } : {});
  const rendered = JSON.stringify(report, null, 2) + "\n";
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice(9)), rendered); else process.stdout.write(rendered);
  if (report.status !== "ok") process.exitCode = 1;
}
if (require.main === module) main(process.argv);
module.exports = { buildOperationsReport };
