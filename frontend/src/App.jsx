// App.jsx

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
import AuthCallback from './pages/auth/AuthCallback.jsx'
import Home from './pages/dashboard/Home'
import All from './pages/all/All'
import GuideHubPage from './pages/guide/GuideHubPage'
import MedicationGuidePage from './pages/guide/MedicationGuidePage'
import MyPage from './pages/user/MyPage'
import ProfileEdit from './pages/user/ProfileEdit'
import MedicalRecordDetail from './pages/medical-record/MedicalRecordDetail.jsx'
import MedicalRecordList from './pages/medical-record/MedicalRecordList.jsx'
import MedicalRecordForm from './pages/medical-record/MedicalRecordForm.jsx'
import PrescriptionOCRUpload from './pages/medical-record/PrescriptionOCRUpload.jsx'
import PrescriptionOCRProcessing from './pages/medical-record/PrescriptionOCRProcessing.jsx'
import PrescriptionOCRResult from './pages/medical-record/PrescriptionOCRResult.jsx'
import HealthCheckList from './pages/health-checkup/HealthCheckList.jsx'
import HealthCheckInput from './pages/health-checkup/HealthCheckInput.jsx'
import HealthCheckResults from './pages/health-checkup/HealthCheckResults.jsx'

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
        {/* 공개 라우트 */}
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

        {/* 인증 라우트 */}
        <Route path="/home" element={<PrivateRoute auth={auth}><Home /></PrivateRoute>} />
        <Route path="/all" element={<PrivateRoute auth={auth}><All /></PrivateRoute>} />
        <Route path="/guide" element={<PrivateRoute auth={auth}><GuideHubPage /></PrivateRoute>} />
        <Route path="/medication-guides/:guideId" element={<PrivateRoute auth={auth}><MedicationGuidePage /></PrivateRoute>} />
        <Route path="/user" element={<PrivateRoute auth={auth}><MyPage /></PrivateRoute>} />
        <Route path="/user/profile/edit" element={<PrivateRoute auth={auth}><ProfileEdit /></PrivateRoute>} />

        {/* 진료기록 */}
        <Route path="/medical-records" element={<PrivateRoute auth={auth}><MedicalRecordList /></PrivateRoute>} />
        <Route path="/medical-records/new" element={<PrivateRoute auth={auth}><MedicalRecordForm /></PrivateRoute>} />
        <Route path="/medical-records/:id" element={<PrivateRoute auth={auth}><MedicalRecordDetail /></PrivateRoute>} />
        <Route path="/medical-records/:id/edit" element={<PrivateRoute auth={auth}><MedicalRecordForm /></PrivateRoute>} />
        <Route path="/medical-records/ocr" element={<PrivateRoute auth={auth}><PrescriptionOCRUpload /></PrivateRoute>} />
        <Route path="/medical-records/ocr/processing" element={<PrivateRoute auth={auth}><PrescriptionOCRProcessing /></PrivateRoute>} />
        <Route path="/medical-records/ocr/result" element={<PrivateRoute auth={auth}><PrescriptionOCRResult /></PrivateRoute>} />

        {/* 건강검진 */}
        <Route path="/health-checkup" element={<PrivateRoute auth={auth}><HealthCheckList /></PrivateRoute>} />
        <Route path="/health-checkup/input" element={<PrivateRoute auth={auth}><HealthCheckInput /></PrivateRoute>} />
        <Route path="/health-checkup/input/:year" element={<PrivateRoute auth={auth}><HealthCheckInput /></PrivateRoute>} />
        <Route path="/health-checkup/results/:year" element={<PrivateRoute auth={auth}><HealthCheckResults /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App