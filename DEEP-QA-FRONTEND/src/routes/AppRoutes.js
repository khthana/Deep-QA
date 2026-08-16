import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import MainPage from '../pages/Mainpage'
import SelectApp from '../pages/SelectApp'
import NotFoundPage from '../pages/PageNotFound'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from '../components/LoadingScreen'
import UserNotFound from '../pages/UserNotFound'
import UserManage from '../components/content/AdminContent/UserMangement/UserManage'
import DepartmentTable from '../components/content/AdminContent/Department/DepartmentTable'
import ProgramsTable from '../components/content/AdminContent/Programs/ProgramsTable'
import SubjectTable from '../components/content/AdminContent/Subject/SubjectTable'
import RubricManage from '../components/content/AdminContent/Rubric/RubricManage'
import CourseInProgram from '../components/content/AdminContent/Subject/CourseInProg'
import MainStudentData from '../components/content/AdminContent/Student/MainStudentData'
import CourseInTerm from '../components/content/AdminContent/Subject/CourseInTerm'
import PLOManage from '../components/content/AdminContent/PLO/PLOManage'
import MappingPLO from '../components/content/AdminContent/PLOMapping/MappingPLO'
import CourseList from '../components/content/TeacherContent/CourseList'
import UserTable from '../components/content/AdminContent/UserMangement/UserTable'
import EditUser from '../components/content/AdminContent/UserMangement/EditUser'
import RubricTable from '../components/content/AdminContent/Rubric/RubricTable'
import EditRubricDetail from '../components/content/AdminContent/Rubric/EditRubricDetail'
import CourseLevelByIntake from '../components/content/AdminContent/courseLevelByIntake/courseLevelByIntake'
import CourseLevelAllStudents from '../components/content/AdminContent/courseLevelAllStudents/courseLevelAllStudents'
import CourseLevelCompare from '../components/content/AdminContent/courseLevelCompare/courseLevelCompare'
import CourseLevelIndividual from '../components/content/AdminContent/courseLevelIndividual/courseLevelIndividual'
import UserHistory from '../components/content/AdminContent/UserMangement/userLogs'

import TeacherDashboard from '../components/content/TeacherContent/TeacherDashboard/TeacherDashboard'
import SubjectStudents from '../components/content/TeacherContent/SubjectStudents/SubjectStudents'
import StudentGroups from '../components/content/TeacherContent/StudentGroups/StudentGroups'
import CourseOutcomes from '../components/content/TeacherContent/CourseOutcomes/CourseOutcomes'
import CourseOutcomeBehaviors from '../components/content/TeacherContent/CourseOutcomes/CourseOutcomeBehaviors'
import CourseOutcomeAttention from '../components/content/TeacherContent/CourseOutcomes/CourseOutcomeAttention'
import GradingWeights from '../components/content/TeacherContent/GradingWeights/GradingWeights'
import LearningActivities from '../components/content/TeacherContent/LearningActivities/LearningActivities'
import TeachingPlan from '../components/content/TeacherContent/TeachingPlan/TeachingPlan'
import ActivityScores from '../components/content/TeacherContent/ActivityScores/ActivityScores'
import CourseResults from '../components/content/TeacherContent/CourseResults/CourseResults'
import StudentResults from '../components/content/TeacherContent/StudentResults/StudentResults'
import LearningDetails from '../components/content/TeacherContent/LearningDetails/LearningDetails'
import OutcomeActivityMapping from '../components/content/TeacherContent/OutcomeActivityMapping/OutcomeActivityMapping'
import AddNewActivity from '../components/content/TeacherContent/LearningActivities/AddNewActicity'
import AssessmentCLO from '../components/content/TeacherContent/AssessmentCLO/AssessmentCLO'
import AssessmentCriteria from '../components/content/TeacherContent/ActivityScores/AssessmentCriteria'
import ContinuousImprove from '../components/content/TeacherContent/ContinuousImprove/ContinuousImprove'

export const ProtectedRoute = ({ children }) => {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen></LoadingScreen>
  if (!profile) return <Navigate to="/" replace />
  return children
}

export const GuestRoute = ({ children }) => {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen></LoadingScreen>
  if (profile) return <Navigate to="/main" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/user-not-found"
        element={
          <GuestRoute>
            <UserNotFound />
          </GuestRoute>
        }
      />
      <Route
        path="/"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route path="select-app" element={<SelectApp />} />
      <Route path="page-not-found" element={<NotFoundPage />} />
      <Route path="load" element={<LoadingScreen />} />
      <Route
        path="/main/*"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      >
        <Route path="select-app" element={<SelectApp />} />
        <Route index element={<div></div>} />
        <Route path="departments" element={<DepartmentTable />} />
        <Route path="programs" element={<ProgramsTable />} />
        <Route path="users" element={<UserManage />}>
          <Route index element={<UserTable />} />
          <Route path="edit-user" element={<EditUser />} />
          <Route path="user-history" element={<UserHistory />} />
        </Route>
        <Route path="subjects" element={<SubjectTable />} />

        <Route path="rubrics" element={<RubricManage />}>
          <Route index element={<RubricTable />} />
          <Route path="edit-Rubric" element={<EditRubricDetail />} />
        </Route>

        <Route path="rubrics" element={<RubricManage />} />
        <Route path="course-in-program" element={<CourseInProgram />} />
        <Route path="student-data" element={<MainStudentData />} />
        <Route path="course-in-term" element={<CourseInTerm />} />
        <Route path="plos" element={<PLOManage />} />
        <Route path="mapping-plo" element={<MappingPLO />} />
        <Route path="course-list" element={<CourseList />} />
        <Route path="courseLevelByIntake" element={<CourseLevelByIntake />} />
        <Route
          path="courseLevelAllStudents"
          element={<CourseLevelAllStudents />}
        />
        <Route path="courseLevelCompare" element={<CourseLevelCompare />} />
        <Route
          path="courseLevelIndividual"
          element={<CourseLevelIndividual />}
        />
      </Route>

      <Route
        path="/teacher/teacherDashboard/*"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      >
        {/* index route -> teacherDashboard */}
        <Route index element={<TeacherDashboard />} />

        {/* ซ้อนอีกชั้น :subjectNameEn */}
        <Route path=":subjectNameEn/">
          <Route path="subjectStudents" element={<SubjectStudents />} />
          <Route path="studentGroups" element={<StudentGroups />} />
          <Route path="courseOutcomes" element={<CourseOutcomes />} />
          <Route
            path="courseOutcomes/:cloId/behaviors"
            element={<CourseOutcomeBehaviors />}
          />
          <Route
            path="courseOutcomes/:cloId/attention"
            element={<CourseOutcomeAttention />}
          />
          <Route path="gradingWeights" element={<GradingWeights />} />
          <Route path="learningActivities" element={<LearningActivities />} />
          <Route
            path="learningActivities/AddNewActivity"
            element={<AddNewActivity />}
          />
          <Route path="teachingPlan" element={<TeachingPlan />} />
          <Route path="activityScores" element={<ActivityScores />} />

          <Route
            path="activityScores/AssessmentCriteria"
            element={<AssessmentCriteria />}
          />
          <Route path="courseResults" element={<CourseResults />} />
          <Route path="studentResults" element={<StudentResults />} />
          <Route path="learningDetails" element={<LearningDetails />} />
          <Route
            path="outcomeActivityMapping"
            element={<OutcomeActivityMapping />}
          />
          <Route path="AssessmentCLO" element={<AssessmentCLO />} />
          <Route path="ContinuousImprove" element={<ContinuousImprove />} />
        </Route>
      </Route>
    </Routes>
  )
}
