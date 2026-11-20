# AGRILEASE – GitHub plan (Mendoza, Sevidal, Gida)

Deadlines from the instructor: **80% checking Nov 10–13**, **defense Nov 18–21** (F3, F1, F2), Nov 23–24 only if unfinished.
Checklist from the instructor: Node.js API, React frontend, PWA offline + background sync, push notifications, real-time chat (WebSocket), database, CRUD via API with soft delete/archiving.
Rule: every member needs **minimum 2 major pushes and 5 minor pushes** (verify them on GitHub: Insights > Contributors / the commit list; a commit is not a push, so push after each task).
Add the instructor as collaborator: Repo > Settings > Collaborators > Add people > `noeldimailig`.

## Assignments (from AGRILEASE.docx section 13)
| Member | Major 1 | Major 2 | 5 minor pushes |
|---|---|---|---|
| **A – Jenalyn Mendoza** | Authentication UI + integration (login, register, owner document upload with preview, JWT, route guards) | Real-time chat (WebSocket/Socket.IO, saved history, authorization) | 1 register form validation messages · 2 logout and expired-session handling · 3 profile edit page · 4 chat timestamps + unread badge · 5 password rules hint |
| **B – Bethoven Sevidal** | Equipment CRUD (add, edit, archive/restore = soft delete, image upload, admin approval, Victoria/Socorro location) | PWA offline (manifest, service worker, app-shell cache, offline queue, background sync, duplicate prevention) | 1 sidebar + hamburger design · 2 equipment card layout (equal height, no overlap) · 3 equipment search/filter + pagination of 10 · 4 admin categories page · 5 install button + offline banner |
| **C – Gemalyn Gida** | Rental requests (create, status transitions, conflict check, price per hour/day/hectare, late fee, cancel) | Push notifications (`push_subscriptions`, VAPID, `POST /api/push/subscribe`, service-worker push event, expired subscriptions) | 1 payment records Cash/GCash status (pending/paid) · 2 in-app notification popup · 3 rental tables filters + date filter · 4 dashboard line + pie charts · 5 subscription plans page |

Major = whole UI of a feature, real-time chat, notifications, or full CRUD of one feature. Minor = a small but real improvement (one sidebar design, one Create form, one filter…).

## Branches
- `main` – stable, what you demo. Nobody pushes directly. Protect it: Settings > Branches > Add rule > Require a pull request.
- `develop` – where finished work is merged and tested together.
- `feature/<member>-<task>` – one branch per task, for example `feature/mendoza-auth-ui`, `feature/sevidal-equipment-crud`, `feature/gida-rental-requests`, `minor/sevidal-sidebar-design`.

## Daily workflow (each member)
1. `git checkout develop && git pull origin develop`
2. `git checkout -b feature/sevidal-equipment-crud`
3. Work, then `git add .` and `git commit -m "feat(equipment): add archive and restore (soft delete)"`
4. `git push -u origin feature/sevidal-equipment-crud`   ← this is the push that counts
5. Open a Pull Request into `develop` on GitHub. A teammate reviews it, then **Merge pull request**.
6. Back to step 1 for the next task.
Commit messages: `feat(...)`, `fix(...)`, `style(...)`, `docs(...)`, `refactor(...)`.
Pull `develop` before starting every task. If Git reports a conflict: open the file, keep both changes where needed, remove the `<<<<<<<` markers, `git add` the file, `git commit`.

## Suggested order
| When | A – Mendoza | B – Sevidal | C – Gida |
|---|---|---|---|
| Nov 8–9 | Repo + auth API and UI | MySQL schema + equipment API | Rental API (create/list) |
| Nov 10–13 (80% check) | Auth done, chat started | Equipment CRUD + admin approval, PWA shell | Status transitions, conflicts, pricing, late fee |
| Nov 14–17 | Chat done, minors | PWA offline queue + sync, minors | Push notifications, minors |
| Nov 18 | Merge `develop` into `main`, tag `v1.0`, full test with the checklist in AGRILEASE.docx section 15 | | |

## Before the defense (each member must be able to explain their own code)
Open every file you pushed and be ready to explain what each function does, which endpoint it calls, and which table it uses. The instructor will use the repository as a quiz and performance check.
