# Bug Report — Task Manager API

## Bug 1 — Status filter uses partial string match (`getByStatus`)

**File:** `src/services/taskService.js` · Line 9

**Expected behavior:**  
`GET /tasks?status=todo` should return only tasks whose status is exactly `"todo"`.

**Actual behavior:**  
`getByStatus` called `t.status.includes(status)`, which performs a substring search. Querying `?status=do` matched tasks with status `"done"`. Querying `?status=in` matched tasks with status `"in_progress"`.

**How discovered:**  
Code review — `.includes()` on a string is a substring check, not an equality check.

**Fix:**  
Replace `.includes(status)` with `=== status` for strict equality.

```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status: ✅ Fixed**

---

## Bug 2 — Pagination offset off by one page (`getPaginated`)

**File:** `src/services/taskService.js` · Lines 11-14

**Expected behavior:**  
`GET /tasks?page=1&limit=2` should return items 1 and 2. `?page=2&limit=2` should return items 3 and 4.

**Actual behavior:**  
The offset was computed as `page * limit`. With page=1, limit=2, the offset was `2`, skipping the first two items entirely. Page 1 returned items 3–4, page 2 returned items 5–6, and items 1–2 were unreachable.

**How discovered:**  
Written a pagination integration test that asserted `res.body[0].title === 'Task 1'` for `page=1` — it failed.

**Fix:**  
Change offset to `(page - 1) * limit` (standard 1-indexed pagination).

```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

**Status: ✅ Fixed**

---

## Bug 3 — `completeTask` silently resets task priority to `"medium"`

**File:** `src/services/taskService.js` · Lines 63-77

**Expected behavior:**  
`PATCH /tasks/:id/complete` should only set `status = "done"` and `completedAt = <timestamp>`. The task's existing priority should be preserved.

**Actual behavior:**  
The implementation spread the existing task and then hardcoded `priority: 'medium'`, unconditionally overwriting whatever priority the task had.

**How discovered:**  
Created a task with `priority: "high"`, completed it, then asserted `priority` was still `"high"` — the assertion failed.

**Fix:**  
Remove the hardcoded `priority: 'medium'` line so the spread of the existing task fields is preserved.

```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

**Status: ✅ Fixed**

---

## Bug 4 — `validateAssignTask` imported but never exported from `validators.js`

**File:** `src/routes/tasks.js` · Line 4 / `src/utils/validators.js` · Line 36

**Expected behavior:**  
The route file destructures `validateAssignTask` from `validators.js`, which should work without error.

**Actual behavior:**  
`validators.js` only exported `validateCreateTask` and `validateUpdateTask`. Importing `validateAssignTask` returned `undefined`, causing any call to it to throw `TypeError: validateAssignTask is not a function`.

**How discovered:**  
Code review — the import in `tasks.js` line 4 named `validateAssignTask`, but it was absent from the `module.exports` in `validators.js`.

**Fix:**  
Add `validateAssignTask` function and include it in `module.exports`.

**Status: ✅ Fixed**

---

## Bug 5 (Missing Feature) — `PATCH /tasks/:id/assign` endpoint does not exist

**File:** `src/routes/tasks.js`

**Expected behavior:**  
The endpoint described in the assignment should accept `{ assignee: string }`, validate it, store it on the task, and return the updated task (or 404 if not found).

**Actual behavior:**  
The endpoint was not implemented. Any request to it returns a 404 from Express's default handler.

**Fix:**  
Added `PATCH /tasks/:id/assign` route with validation and delegated to a new `assignTask` service function.

**Status: ✅ Fixed (new feature implemented)**
