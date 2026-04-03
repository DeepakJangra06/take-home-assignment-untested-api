# Submission Note

## What I'd test next with more time

- **Invalid UUID formats** in route params (e.g., `/tasks/not-a-uuid`) — currently the API accepts any string as an ID with no format validation.
- **Concurrent request behavior** — since the data store is a plain in-memory array, there's no locking; concurrent writes could theoretically corrupt state.
- **`GET /tasks` with both `status` and `page`/`limit` simultaneously** — only one branch gets evaluated; combined filtering + pagination is not supported.
- **Large payloads / injection** — no body size limit or deep sanitization; a huge `description` would be accepted unchecked.
- **Performance tests** — the paginated endpoint slices the full in-memory array on every call. With thousands of tasks this still works, but it's worth characterizing.

## Anything that surprised me in the codebase

- `validators.js` **already imported `validateAssignTask`** in the routes file (line 4), but the function was never defined or exported — the assign endpoint was thought about but never implemented. This is a clean signal of an incomplete feature.
- `completeTask` **resets the task's priority to `"medium"`** unconditionally — this looks like a copy-paste mistake or an unintentional default, not intentional design.
- `getPaginated` uses `page * limit` as the offset — classic 0-indexed vs 1-indexed confusion that's easy to miss in code review.
- `getByStatus` uses `.includes()` for status matching — this is subtly wrong because `.includes()` on a string is a substring check. `"in_progress".includes("in")` is `true`, which would cause silent, hard-to-debug cross-contamination between statuses.

## Questions I'd ask before shipping to production

1. **Authentication / authorization** — who can create, update, delete, or assign tasks? There's no auth at all currently.
2. **Persistence** — the in-memory store resets on restart. Is that intentional for the MVP, or do we need a database before go-live?
3. **Rate limiting** — no throttling on any endpoint; a single client could exhaust server resources.
4. **Validation strictness** — should `PATCH /tasks/:id/assign` reject re-assignment if the task is already assigned to someone? The assignment asks us to think about this — I chose to allow it (reassignment is valid), but that's a product decision.
5. **Soft deletes vs hard deletes** — `DELETE /tasks/:id` permanently removes tasks instantly. Is an audit trail or recovery needed?
6. **API versioning** — no `/v1/` prefix; adding a breaking change later would be painful without versioning baked in from the start.
