import { Navigate, Route, Routes } from 'react-router-dom'

import Login from '../pages/Login'
import MainPage from '../pages/Mainpage'
import SelectApp from '../pages/SelectApp'
import NotFoundPage from '../pages/PageNotFound'
import UserNotFound from '../pages/UserNotFound'
import Departments from '../pages/Departments'
import NotBuiltYet from '../pages/NotBuiltYet'
import Offerings from '../pages/Offerings'
import Plos from '../pages/Plos'
import PloMapping from '../pages/PloMapping'
import RubricCriteria from '../pages/RubricCriteria'
import Rubrics from '../pages/Rubrics'
import Programs from '../pages/Programs'
import ProgramSubjects from '../pages/ProgramSubjects'
import Students from '../pages/Students'
import Subjects from '../pages/Subjects'
import TeacherDashboard from '../pages/TeacherDashboard'
import TeacherSection from '../pages/TeacherSection'
import CourseOutcomes from '../pages/CourseOutcomes'
import MeasurableBehaviors from '../pages/MeasurableBehaviors'
import AchievementCriteria from '../pages/AchievementCriteria'
import GradingWeights from '../pages/GradingWeights'
import TeachingPlan from '../pages/TeachingPlan'
import SubjectStudents from '../pages/SubjectStudents'
import Users from '../pages/Users'
import UserHistory from '../pages/UserHistory'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from '../context/AuthContext'

/**
 * The routes the shell knows about — #10.
 *
 * Every path the sidebar can navigate to has an entry, because a menu whose
 * entries lead nowhere cannot be shown to anyone. What is behind most of them
 * is `NotBuiltYet` until the ticket that builds the screen replaces the
 * element: #11 has replaced the users one, #14 and #15 the departments and
 * programmes ones, #16 subjects, #17 students, #18 the subjects in a
 * programme, #23 the term they are opened in and #24 the teacher's own
 * sections, and the rest are still to come. Route paths are the ones
 * the inherited application used, with the four `courseLevel*` renamed
 * `programLevel*` as CONTEXT.md requires — those screens are about a
 * programme, not a course.
 *
 * Not carried over: the second, duplicate `rubrics` declaration, which the
 * router silently ignored, and the STUDENT tree, since students are records
 * here and not accounts.
 */

export const ProtectedRoute = ({ children }) => {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!profile) return <Navigate to="/" replace />
  return children
}

export const GuestRoute = ({ children }) => {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (profile) return <Navigate to="/main" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      {/* The Google path refuses by redirecting to /login?error=<reason>
          (backend/routes/auth.js). Sign-in lives at '/', so without this the
          refusal would land on the catch-all and tell the person the page does
          not exist rather than why they were turned away. */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/user-not-found"
        element={
          <GuestRoute>
            <UserNotFound />
          </GuestRoute>
        }
      />
      <Route
        path="/select-app"
        element={
          <ProtectedRoute>
            <SelectApp />
          </ProtectedRoute>
        }
      />
      <Route path="/page-not-found" element={<NotFoundPage />} />

      <Route
        path="/main/*"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<div />} />
        <Route path="users" element={<Users />} />
        {/* #13. A child of `users` rather than a sibling because the
            breadcrumb reads it as one - ข้อมูลผู้ใช้งาน / ประวัติการใช้งาน -
            and docs/05 A13 gives the path in that shape. */}
        <Route path="users/user-history" element={<UserHistory />} />
        <Route path="departments" element={<Departments />} />
        <Route path="programs" element={<Programs />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="rubrics" element={<Rubrics />} />
        {/* #21's fifth criterion lands here and #22 built it. The rubric's id
            in the path is the whole of the context this screen needs -
            ADR-0004's shape, applied one screen down - and it is also what
            authorises the request: a criterion carries no หลักสูตร of its own,
            so the rubric named here is the only thing the server has to check. */}
        <Route path="rubrics/:rubricId/criteria" element={<RubricCriteria />} />
        <Route path="course-in-program" element={<ProgramSubjects />} />
        <Route path="student-data" element={<Students />} />
        <Route path="course-in-term" element={<Offerings />} />
        <Route path="plos" element={<Plos />} />
        <Route path="mapping-plo" element={<PloMapping />} />
        <Route
          path="programLevelByIntake"
          element={<NotBuiltYet ticket="#42" />}
        />
        <Route
          path="programLevelCompare"
          element={<NotBuiltYet ticket="#44" />}
        />
        <Route
          path="programLevelIndividual"
          element={<NotBuiltYet ticket="#45" />}
        />
        <Route
          path="programLevelAllStudents"
          element={<NotBuiltYet ticket="#43" />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/teacher/teacherDashboard/*"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        {/*
          The Section context - ADR-0004. The id in the path is the whole of it:
          it is what the dashboard navigates to, what a reload still has, and
          what the sidebar reads to decide whether the Section-specific entries
          are shown at all. The screens under it are #27 onwards.
        */}
        <Route path=":sectionId">
          <Route index element={<TeacherSection />} />
          <Route path="subjectStudents" element={<SubjectStudents />} />
          <Route path="courseOutcomes" element={<CourseOutcomes />} />
          <Route
            path="courseOutcomes/:cloId/behaviors"
            element={<MeasurableBehaviors />}
          />
          <Route
            path="courseOutcomes/:cloId/criteria"
            element={<AchievementCriteria />}
          />
          <Route path="gradingWeights" element={<GradingWeights />} />
          <Route path="teachingPlan" element={<TeachingPlan />} />
          <Route path="*" element={<NotBuiltYet />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
