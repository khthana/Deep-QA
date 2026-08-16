# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server on port 5000 (set in .env)
npm run build      # production build → build/
npm test           # jest in watch mode (react-scripts test)
npm test -- --watchAll=false   # run tests once (CI mode)

# Format all source files
npx prettier --write "src/**/*.{js,jsx,ts,tsx}"
```

**Docker build** (matches CI):
```bash
docker build -t deep-qa-frontend .
docker run -p 5000:5000 deep-qa-frontend
```

CI/CD deploys on push to the `production` branch via SSH + docker-compose.

## Environment

Copy `.env` and set `REACT_APP_API_URL` to your backend URL. The app fetches all data from `${process.env.REACT_APP_API_URL}/api/...`. Auth uses HttpOnly cookies (`credentials: 'include'`).

## Architecture

### Auth & routing

`src/context/AuthContext.js` holds the session: `profile` (user object from `/api/protected/profile`), `loading`, and `logout`. Session presence is bootstrapped from `localStorage.isLoggedIn`.

`src/routes/AppRoutes.js` defines all routes in two protected trees:
- `/main/*` — admin area (departments, programs, subjects, rubrics, PLOs, users, reports)
- `/teacher/teacherDashboard/*` — teacher area, nested under `:subjectNameEn`

Both trees render `<MainPage>` as the shell (Navbar + collapsible Sidebar + `<Outlet>`).

### Role-based sidebar

`src/components/SidebarItem.js` selects a menu config based on `selectedRole` (Thai display name). Menu configs live in `src/components/SidebarItem/`:

| File | Role code | Thai label |
|---|---|---|
| `FullAddmin.js` | FULL_ADMIN | ผู้ดูแลระบบกลาง |
| `FacultyAdmin.js` | FACULTY_ADMIN | ผู้ดูแลระบบระดับคณะ |
| `DeprtAdmin.js` | DEPT_ADMIN | ผู้ดูแลระบบระดับภาควิชา |
| `ProgManager.js` | PROG_MANAGER | กรรมการหลักสูตร |
| `Teacher.js` | TEACHER | อาจารย์ |
| `Student.js` | STUDENT | นักศึกษา |
| `Guest.js` | GUEST | บุคคลทั่วไป |

Role code ↔ Thai name conversion: `src/components/MapRole.js`.

**Teacher subject paths** use the `%SUBJECT%` placeholder (e.g. `/teacher/teacherDashboard/%SUBJECT%/activityScores`). At render time it is replaced with `{subject_name_en_with_dashes}-Section-{section}`, read from `localStorage.selectedCourse` and `localStorage.section`.

### Feature modules

Admin content lives in `src/components/content/AdminContent/<Feature>/`.  
Teacher content lives in `src/components/content/TeacherContent/<Feature>/`.

PDF export utilities (`pdfUtils.js`, `assessmentPdfUtils.js`) use **jsPDF + jspdf-autotable** with custom Thai fonts embedded in `src/assets/Fonts/` (the `-normal.js` files are base64 font registrations).

### Styling

- **Tailwind CSS v3** — utility-first; configured in `tailwind.config.js`
- Custom brand colors: `primary` (#0F2A60), `secondary` (#003296)
- Custom font class: `font-thai` → "Noto Sans Thai"
- **MUI v7** and **@material-tailwind/react** are used alongside Tailwind; MUI components (Alert, Snackbar, Dialog, etc.) appear throughout
- **framer-motion** for page/sidebar animations; `<ContentMotionDIV>` wraps page transitions

### Charts & data

- **AG Charts** (community + enterprise) and **Chart.js / react-chartjs-2** for most charts
- **@nivo/sankey** for the outcome-activity mapping Sankey diagram
- **xlsx** and **file-saver** for Excel import/export templates
- Import dialogs (`ImportXxxDialog.js`) follow a consistent pattern: parse XLSX, POST to API, surface per-row errors via `setAlert`

## Code style

Prettier is enforced (no semicolons, single quotes, 2-space indent, trailing commas in ES5 positions, Tailwind class sorting via `prettier-plugin-tailwindcss`). Config: `prettier.config.cjs`.
