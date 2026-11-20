# Portal Header, Notification Badge, and Pagination Unification

- Standardized the Farmer, Owner, and Admin header height, spacing, title hierarchy, icon controls, and responsive behavior.
- Applied a shared red numeric notification badge: hidden at zero and capped at `99+`.
- Kept role-specific header actions (Farmer/Owner messages and notifications; Admin notifications) while aligning their appearance.
- Updated the reusable pagination component used by Admin, Owner, and Farmer pages to show only Previous and Next, retaining the record-range summary and disabled states.
- Checked JSX syntax for the three role layouts/dashboard and pagination component using TypeScript transpilation.
- A full Vite build and live browser/database test were not run because frontend dependencies are not installed in this working copy.


Pagination correction: all paginated lists display 8 records per page across Farmer, Owner, and Admin. The shared Pagination default is 8, and Reports uses 8 as well.
