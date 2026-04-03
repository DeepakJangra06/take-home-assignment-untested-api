'use strict';

const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── getAll ────────────────────────────────────────────────────────────────
describe('getAll', () => {
  test('returns empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns a copy — mutating it does not affect the store', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── findById ──────────────────────────────────────────────────────────────
describe('findById', () => {
  test('returns the task when id exists', () => {
    const t = taskService.create({ title: 'find me' });
    expect(taskService.findById(t.id)).toEqual(t);
  });

  test('returns undefined for unknown id', () => {
    expect(taskService.findById('non-existent')).toBeUndefined();
  });
});

// ─── getByStatus ───────────────────────────────────────────────────────────
describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'in_progress' });
    taskService.create({ title: 'T3', status: 'done' });
  });

  test('filters tasks by exact status', () => {
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('T1');
  });

  test('does NOT return partial matches — "do" should not match "done"', () => {
    // Bug was: .includes('do') matched 'done'
    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0);
  });

  test('returns empty array for unknown status', () => {
    expect(taskService.getByStatus('invalid')).toHaveLength(0);
  });
});

// ─── getPaginated ──────────────────────────────────────────────────────────
describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('page 1 returns the first N items', () => {
    const result = taskService.getPaginated(1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
  });

  test('page 2 returns the next N items', () => {
    const result = taskService.getPaginated(2, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
  });

  test('last page returns remaining items', () => {
    const result = taskService.getPaginated(3, 2);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task 5');
  });

  test('page beyond data returns empty array', () => {
    expect(taskService.getPaginated(10, 2)).toHaveLength(0);
  });
});

// ─── getStats ──────────────────────────────────────────────────────────────
describe('getStats', () => {
  test('returns zero counts when empty', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status correctly', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks (non-done past due date)', () => {
    const past = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const future = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    taskService.create({ title: 'Past todo', dueDate: past });
    taskService.create({ title: 'Future todo', dueDate: future });
    taskService.create({ title: 'Past done', dueDate: past, status: 'done' });
    expect(taskService.getStats().overdue).toBe(1);
  });
});

// ─── create ────────────────────────────────────────────────────────────────
describe('create', () => {
  test('creates a task with required fields and sensible defaults', () => {
    const task = taskService.create({ title: 'My Task' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('My Task');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('accepts optional fields', () => {
    const task = taskService.create({ title: 'T', status: 'in_progress', priority: 'high', dueDate: '2030-01-01T00:00:00.000Z', description: 'desc' });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.description).toBe('desc');
  });
});

// ─── update ────────────────────────────────────────────────────────────────
describe('update', () => {
  test('updates specified fields only', () => {
    const task = taskService.create({ title: 'Original', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'Changed' });
    expect(updated.title).toBe('Changed');
    expect(updated.priority).toBe('low'); // unchanged
  });

  test('returns null for unknown id', () => {
    expect(taskService.update('ghost', { title: 'X' })).toBeNull();
  });
});

// ─── remove ────────────────────────────────────────────────────────────────
describe('remove', () => {
  test('returns true and removes the task', () => {
    const task = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('returns false for unknown id', () => {
    expect(taskService.remove('ghost')).toBe(false);
  });
});

// ─── completeTask ──────────────────────────────────────────────────────────
describe('completeTask', () => {
  test('sets status to done and records completedAt', () => {
    const task = taskService.create({ title: 'Finish me', priority: 'high' });
    const result = taskService.completeTask(task.id);
    expect(result.status).toBe('done');
    expect(result.completedAt).not.toBeNull();
  });

  test('preserves the original priority (bug fix verification)', () => {
    const task = taskService.create({ title: 'High prio', priority: 'high' });
    const result = taskService.completeTask(task.id);
    expect(result.priority).toBe('high'); // must NOT be reset to 'medium'
  });

  test('returns null for unknown id', () => {
    expect(taskService.completeTask('ghost')).toBeNull();
  });
});

// ─── assignTask ────────────────────────────────────────────────────────────
describe('assignTask', () => {
  test('assigns a person to a task', () => {
    const task = taskService.create({ title: 'Assign me' });
    const result = taskService.assignTask(task.id, 'Alice');
    expect(result.assignee).toBe('Alice');
  });

  test('overwrites an existing assignee', () => {
    const task = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(task.id, 'Alice');
    const result = taskService.assignTask(task.id, 'Bob');
    expect(result.assignee).toBe('Bob');
  });

  test('returns null for unknown id', () => {
    expect(taskService.assignTask('ghost', 'Alice')).toBeNull();
  });
});
