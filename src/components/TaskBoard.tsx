import React, { useState, useMemo } from "react";
import {
  CheckSquare,
  Plus,
  AlertCircle,
  Clock,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHostel } from "../HostelContext";
import { useTranslation } from "../i18nContext";
import { useStaff } from "../StaffContext";
import { format, formatDistanceToNow, parseISO, isToday, isPast } from "date-fns";
import { Task, TaskStatus, TaskPriority, TaskCategory } from "../types";

const STATUS_ORDER: TaskStatus[] = ["open", "in-progress", "completed"];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const COLUMN_BORDER_COLORS: Record<TaskStatus, string> = {
  open: "border-t-blue-500",
  "in-progress": "border-t-amber-500",
  completed: "border-t-green-500",
};

export function TaskBoard() {
  const { tasks, addTask, updateTaskStatus, updateTask, deleteTask, addTaskComment } = useHostel();
  const { t } = useTranslation();
  const { currentStaff, activeStaffList } = useStaff();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [commentText, setCommentText] = useState("");

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      open: [],
      "in-progress": [],
      completed: [],
    };
    for (const task of tasks) {
      map[task.status].push(task);
    }
    return map;
  }, [tasks]);

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    addTask({
      title,
      status: "open",
      priority: newTaskPriority,
      category: "other",
    });
    setNewTaskTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTask();
    }
  };

  const moveTask = (taskId: string, direction: "left" | "right") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const idx = STATUS_ORDER.indexOf(task.status);
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;
    updateTaskStatus(taskId, STATUS_ORDER[newIdx]);
  };

  const handleAddComment = (taskId: string) => {
    const content = commentText.trim();
    if (!content) return;
    addTaskComment(taskId, currentStaff?.name || "Staff", content);
    setCommentText("");
  };

  const formatDueDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return t("tasks.today") || "Today";
      return format(date, "MMM d");
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      return isPast(parseISO(dateStr));
    } catch {
      return false;
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const statusLabel = (status: TaskStatus) => {
    switch (status) {
      case "open":
        return t("tasks.open") || "Open";
      case "in-progress":
        return t("tasks.inProgress") || "In Progress";
      case "completed":
        return t("tasks.completed") || "Completed";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {STATUS_ORDER.map((status) => {
        const columnTasks = grouped[status];
        const statusIdx = STATUS_ORDER.indexOf(status);

        return (
          <div
            key={status}
            className={`flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 border-t-4 ${COLUMN_BORDER_COLORS[status]} min-w-0`}
          >
            {/* Column header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === "open" && <AlertCircle className="size-4 text-blue-500" />}
                {status === "in-progress" && <Clock className="size-4 text-amber-500" />}
                {status === "completed" && <CheckSquare className="size-4 text-green-500" />}
                <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                  {statusLabel(status)}
                </h3>
              </div>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-200 dark:bg-zinc-700 rounded-full px-2 py-0.5">
                {columnTasks.length}
              </span>
            </div>

            {/* Task cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {columnTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const overdue = status !== "completed" && isOverdue(task.dueDate);
                const isCompleted = status === "completed";

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border bg-white dark:bg-zinc-800 shadow-sm transition-colors ${
                      isCompleted
                        ? "border-zinc-200 dark:border-zinc-700 opacity-60"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    {/* Card header row */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <GripVertical className="size-4 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                PRIORITY_COLORS[task.priority]
                              }`}
                            >
                              {task.priority.toUpperCase()}
                            </span>
                            {task.dueDate && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  overdue
                                    ? "text-red-600 font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                <Clock className="size-3" />
                                {formatDueDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm font-medium leading-snug cursor-pointer ${
                              isCompleted
                                ? "line-through text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-800 dark:text-zinc-100"
                            }`}
                            onClick={() => toggleExpand(task.id)}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.assignee && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                <User className="size-3" />
                                {task.assignee}
                              </span>
                            )}
                            {task.comments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                <MessageSquare className="size-3" />
                                {task.comments.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Move & expand buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {statusIdx > 0 && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => moveTask(task.id, "left")}
                              title="Move left"
                            >
                              ←
                            </Button>
                          )}
                          {statusIdx < STATUS_ORDER.length - 1 && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => moveTask(task.id, "right")}
                              title="Move right"
                            >
                              →
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => toggleExpand(task.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-700 pt-2 space-y-3">
                        {task.description && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Edit priority & assignee */}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500">
                              {t("tasks.priority") || "Priority"}:
                            </span>
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                updateTask(task.id, {
                                  priority: e.target.value as TaskPriority,
                                })
                              }
                              className="text-xs border border-zinc-200 dark:border-zinc-600 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500">
                              {t("tasks.assignee") || "Assignee"}:
                            </span>
                            <select
                              value={task.assignee || ""}
                              onChange={(e) =>
                                updateTask(task.id, { assignee: e.target.value || undefined })
                              }
                              className="text-xs border border-zinc-200 dark:border-zinc-600 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                            >
                              <option value="">—</option>
                              {activeStaffList.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Comments */}
                        <div>
                          <p className="text-[11px] font-medium text-zinc-500 mb-1.5">
                            {t("tasks.comments") || "Comments"} ({task.comments.length})
                          </p>
                          {task.comments.length > 0 && (
                            <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                              {task.comments.map((c) => (
                                <div
                                  key={c.id}
                                  className="text-xs bg-zinc-50 dark:bg-zinc-700/50 rounded px-2 py-1.5"
                                >
                                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                    {c.author}
                                  </span>{" "}
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {c.content}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={expandedTaskId === task.id ? commentText : ""}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(task.id);
                              }}
                              placeholder={t("tasks.addComment") || "Add a comment..."}
                              className="flex-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded px-2 py-1 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400"
                            />
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleAddComment(task.id)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {columnTasks.length === 0 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
                  {t("tasks.noTasks") || "No tasks"}
                </p>
              )}
            </div>

            {/* Quick add (Open column only) */}
            {status === "open" && (
              <div className="px-3 py-2.5 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("tasks.addTask") || "Add a task..."}
                    className="flex-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded px-2 py-1.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="text-xs border border-zinc-200 dark:border-zinc-600 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Med</option>
                    <option value="high">High</option>
                  </select>
                  <Button variant="outline" size="xs" onClick={handleAddTask}>
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
