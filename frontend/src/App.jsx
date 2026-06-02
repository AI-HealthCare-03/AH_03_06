import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { getAccessToken, clearTokens } from './utils/token.js'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import FindEmail from './pages/auth/FindEmail'
import FindPassword from './pages/auth/FindPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Register from './pages/auth/Register'
import RegisterNickname from './pages/auth/RegisterNickname'
import RegisterBasicInfo from './pages/auth/RegisterBasicInfo'
import RegisterBodyInfo from './pages/auth/RegisterBodyInfo'
import RegisterLifestyle from './pages/auth/RegisterLifestyle'
import RegisterSleep from './pages/auth/RegisterSleep'
import RegisterHealth from './pages/auth/RegisterHealth'
import AuthCallback from "./pages/auth/AuthCallback.jsx"
import Home from './pages/dashboard/Home'
import All from './pages/all/All'
import GuideHubPage from './pages/guide/GuideHubPage'
import MedicationGuidePage from './pages/guide/MedicationGuidePage'
import MedicationGuidePreview from './pages/guide/MedicationGuidePreview'
import MedicationGuideListPage from './pages/guide/MedicationGuideListPage'
import MedicationGuideGenerating from './pages/guide/MedicationGuideGenerating'
import SleepGuideListPage from './pages/guide/SleepGuideListPage'
import SleepGuideInputPage from './pages/guide/SleepGuideInputPage'
import SleepGuidePage from './pages/guide/SleepGuidePage'
import DietGuideListPage from './pages/guide/DietGuideListPage.jsx'
import DietGuidePage from './pages/guide/DietGuidePage.jsx'
import ExerciseGuideListPage from './pages/guide/ExerciseGuideListPage.jsx'
import ExerciseGuidePage from './pages/guide/ExerciseGuidePage.jsx'
import MyPage from './pages/user/MyPage'
import ProfileEdit from './pages/user/ProfileEdit'
import MedicalRecordDetail from './pages/medical-record/MedicalRecordDetail.jsx'
import MedicalRecordList from './pages/medical-record/MedicalRecordList.jsx'
import MedicalRecordForm from './pages/medical-record/MedicalRecordForm.jsx'
import PrescriptionOCRUpload from './pages/medical-record/PrescriptionOCRUpload'
import PrescriptionOCRProcessing from './pages/medical-record/PrescriptionOCRProcessing'
import PrescriptionOCRResult from './pages/medical-record/PrescriptionOCRResult'
import HealthCheckList from "./pages/health-checkup/HealthCheckList.jsx"
import HealthCheckInput from "./pages/health-checkup/HealthCheckInput.jsx"
import HealthCheckResults from "./pages/health-checkup/HealthCheckResults.jsx"
import MedicationPage from './pages/medication/MedicationPage.jsx'



import MedicationRecordPage from './pages/medication/MedicationRecordPage.jsx'
import MedicationFormPage from './pages/medication/MedicationFormPage.jsx'
import MedicationDashboardPage from './pages/medication/MedicationDashboardPage.jsx';
import MedicationHistoryPage from './pages/medication/MedicationHistoryPage.jsx';


import ChatPage from './pages/chat/ChatPage.jsx'

let _setAuth = null
export function logout() {
  clearTokens()
  _setAuth?.(false)
}

export function loginSuccess() {
  _setAuth?.(true)
}

function PrivateRoute({ auth, children }) {
  return auth ? children : <Navigate to="/login" replace />
}

function PublicRoute({ auth, children }) {
  return auth ? <Navigate to="/home" replace /> : children
}

function App() {
  const [auth, setAuth] = useState(!!getAccessToken())
  _setAuth = setAuth

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute auth={auth}><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute auth={auth}><Login /></PublicRoute>} />
        <Route path="/email/find" element={<PublicRoute auth={auth}><FindEmail /></PublicRoute>} />
        <Route path="/password/find" element={<PublicRoute auth={auth}><FindPassword /></PublicRoute>} />
        <Route path="/password/reset" element={<ResetPassword />} />
        <Route path="/register" element={<PublicRoute auth={auth}><Register /></PublicRoute>} />
        <Route path="/register/nickname" element={<PublicRoute auth={auth}><RegisterNickname /></PublicRoute>} />
        <Route path="/register/basic-info" element={<PublicRoute auth={auth}><RegisterBasicInfo /></PublicRoute>} />
        <Route path="/register/body-info" element={<PublicRoute auth={auth}><RegisterBodyInfo /></PublicRoute>} />
        <Route path="/register/lifestyle" element={<PublicRoute auth={auth}><RegisterLifestyle /></PublicRoute>} />
        <Route path="/register/sleep" element={<PublicRoute auth={auth}><RegisterSleep /></PublicRoute>} />
        <Route path="/register/health" element={<PublicRoute auth={auth}><RegisterHealth /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<PrivateRoute auth={auth}><Home /></PrivateRoute>} />
        <Route path="/all" element={<PrivateRoute auth={auth}><All /></PrivateRoute>} />
        <Route path="/guide" element={<PrivateRoute auth={auth}><GuideHubPage /></PrivateRoute>} />
        <Route path="/medication-guides" element={<PrivateRoute auth={auth}><MedicationGuideListPage /></PrivateRoute>} />
        <Route path="/medication-guides/preview" element={<MedicationGuidePreview />} />
        <Route path="/medication-guides/generate" element={<PrivateRoute auth={auth}><MedicationGuideGenerating /></PrivateRoute>} />
        <Route path="/medication-guides/:guideId" element={<PrivateRoute auth={auth}><MedicationGuidePage /></PrivateRoute>} />
        <Route path="/sleep-guides" element={<PrivateRoute auth={auth}><SleepGuideListPage /></PrivateRoute>} />
        <Route path="/sleep-guides/new" element={<PrivateRoute auth={auth}><SleepGuideInputPage /></PrivateRoute>} />
        <Route path="/sleep-guides/:guideId" element={<PrivateRoute auth={auth}><SleepGuidePage /></PrivateRoute>} />
        <Route path="/diet-guides" element={<PrivateRoute auth={auth}><DietGuideListPage /></PrivateRoute>} />
        <Route path="/diet-guides/:date" element={<PrivateRoute auth={auth}><DietGuidePage /></PrivateRoute>} />
        <Route path="/exercise-guides" element={<PrivateRoute auth={auth}><ExerciseGuideListPage /></PrivateRoute>} />
        <Route path="/guide/exercise" element={<PrivateRoute auth={auth}><ExerciseGuidePage /></PrivateRoute>} />
        <Route path="/user" element={<PrivateRoute auth={auth}><MyPage /></PrivateRoute>} />
        <Route path="/user/profile/edit" element={<PrivateRoute auth={auth}><ProfileEdit /></PrivateRoute>} />
        <Route path="/health-checkup" element={<PrivateRoute auth={auth}><HealthCheckList /></PrivateRoute>} />
        <Route path="/health-checkup/input" element={<PrivateRoute auth={auth}><HealthCheckInput /></PrivateRoute>} />
        <Route path="/health-checkup/input/:year" element={<PrivateRoute auth={auth}><HealthCheckInput /></PrivateRoute>} />
        <Route path="/health-checkup/results/:year" element={<PrivateRoute auth={auth}><HealthCheckResults /></PrivateRoute>} />
        <Route path="/medical-records" element={<MedicalRecordList />} />
        <Route path="/medical-records/new" element={<MedicalRecordForm />} />
        <Route path="/medical-records/:id" element={<MedicalRecordDetail />} />
        <Route path="/medical-records/:id/edit" element={<MedicalRecordForm />} />
        <Route path="/medical-records/ocr" element={<PrescriptionOCRUpload />} />
        <Route path="/medical-records/ocr/processing" element={<PrescriptionOCRProcessing />} />
        <Route path="/medical-records/ocr/result" element={<PrescriptionOCRResult />} />
        <Route path="/medication" element={<PrivateRoute auth={auth}><MedicationPage /></PrivateRoute>} />
        <Route path="/medication/record" element={<PrivateRoute auth={auth}><MedicationRecordPage /></PrivateRoute>} />
        <Route path="/medication/form" element={<PrivateRoute auth={auth}><MedicationFormPage /></PrivateRoute>} />
        <Route path="/medication/history" element={<PrivateRoute auth={auth}><MedicationHistoryPage /></PrivateRoute>} />
        <Route path="/chat/:sessionId" element={<PrivateRoute auth={auth}><ChatPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App