# The Untested API - Take-Home Assignment

![Deployment Status](https://img.shields.io/badge/Deployed-Render-brightgreen)
![Test Coverage](https://img.shields.io/badge/Test_Coverage-100%25-blue)

A complete solution to "The Untested API" assignment. The API has been drastically stabilized, thoroughly tested, and deployed to production. 

🚀 **Live API Endpoint:** [https://take-home-assignment-untested-api.onrender.com](https://take-home-assignment-untested-api.onrender.com)
*(Note: As this runs an in-memory data store, any inserted tasks will reset whenever the server spins down. To test the API, try visiting `/tasks`!)*

---

## 📋 Assignment Completion Summary

**1. Comprehensive Testing**
- Exhaustive unit tests cover all `taskService.js` utilities ensuring strict logic evaluation and state encapsulation.
- Integration tests via `Supertest` validate all edge cases and active branches across the Express route infrastructure.

**2. Bug Identification & Fixes**
Four distinct defects were uncovered, detailed, and resolved:
- **Pagination Misalignment:** Calculation bug skipping active boundaries `(page * limit)` replaced by standard `(page - 1) * limit`.
- **Status Partial Matching:** Abstract matching (`.includes()`) substituted with strict equality (`===`) preventing invalid database leaks between `done` and `in_progress` filters.
- **Priority Loss:** A bug which unconditionally set any task marked as complete down to `medium` priority was successfully fixed.
- **Missing Exports:** `validateAssignTask` was cleanly exported preventing `TypeError` server crashes.

**3. New Feature: Assign Task Endpoint**
- **Endpoint Added:** `PATCH /tasks/:id/assign` 
- Fully functional route logic processing incoming strings, safely altering application memory, catching blank names/white-spaces, and delivering validated database objects to the client.

## 📂 Deliverables & Documentation
- All documented logic constraints, fixes, bounds testing, and rationale are located in:
  - `BUG_REPORT.md`
  - `SUBMISSION_NOTE.md`
- Code specifically targeting these assignment deliverables is annotated in-line using:
  - `// BUG FIX:`
  - `// NEW FEATURE:`

## 🚀 Local Development

To run this application locally:

```bash
cd task-api
npm install
npm start        # runs on port 3000
npm test         # runs the full test suite
```
