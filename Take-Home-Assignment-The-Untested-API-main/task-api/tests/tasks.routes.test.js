'use strict';

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── GET /tasks ────────────────────────────────────────────────────────────
describe('GET /tasks', () => {
  test('returns empty array initially', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // Status filter
  test('?status=todo returns only todo tasks', async () => {
    await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'T2', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('T1');
  });

  test('?status=in_progress returns only in_progress tasks (exact match)', async () => {
    await request(app).post('/tasks').send({ title: 'T1', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'T2', status: 'done' });
    const res = await request(app).get('/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('partial status string does NOT match — ?status=do should not return "done" tasks', async () => {
    await request(app).post('/tasks').send({ title: 'done task', status: 'done' });
    const res = await request(app).get('/tasks?status=do');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0); // Bug was: returned 1
  });

  // Pagination
  test('?page=1&limit=2 returns first 2 tasks', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('?page=2&limit=2 returns tasks 3 and 4', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3'); // Bug was: returned Task 5
  });
});

// ─── GET /tasks/stats ──────────────────────────────────────────────────────
describe('GET /tasks/stats', () => {
  test('returns zero counts initially', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks correctly', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'in_progress' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
  });
});

// ─── POST /tasks ───────────────────────────────────────────────────────────
describe('POST /tasks', () => {
  test('creates a task and returns 201', async () => {
    const res = await request(app).post('/tasks').send({ title: 'New Task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Task');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test('returns 400 for invalid status', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', status: 'pending' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  test('accepts all valid fields', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Full task',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-12-31T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
  });
});

// ─── PUT /tasks/:id ────────────────────────────────────────────────────────
describe('PUT /tasks/:id', () => {
  test('updates an existing task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Old' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/tasks/fake-id').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid update data', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ status: 'flying' });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /tasks/:id ─────────────────────────────────────────────────────
describe('DELETE /tasks/:id', () => {
  test('returns 204 and removes the task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Delete me' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);

    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/tasks/ghost');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /tasks/:id/complete ─────────────────────────────────────────────
describe('PATCH /tasks/:id/complete', () => {
  test('marks task as done and sets completedAt', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Finish', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('preserves priority — does NOT reset it to medium (bug fix)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'High', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('high'); // must NOT be 'medium'
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/tasks/ghost/complete');
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /tasks/:id/assign ───────────────────────────────────────────────
describe('PATCH /tasks/:id/assign', () => {
  test('assigns a person and returns the updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('trims whitespace from assignee name', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '  Bob  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('allows reassigning to a different person', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Charlie' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Charlie');
  });

  test('returns 404 if task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  test('returns 400 when assignee is missing', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  test('returns 400 when assignee is an empty string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is whitespace only', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is not a string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 123 });
    expect(res.status).toBe(400);
  });
});
