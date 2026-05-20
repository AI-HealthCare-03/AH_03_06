import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getAccessToken } from './utils/token.js'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RegisterNickname from './pages/auth/RegisterNickname'
import RegisterBasicInfo from './pages/auth/RegisterBasicInfo'
import RegisterBodyInfo from './pages/auth/RegisterBodyInfo'
import RegisterLifestyle from './pages/auth/RegisterLifestyle'
import RegisterSleep from './pages/auth/RegisterSleep'
import RegisterHealth from './pages/auth/RegisterHealth'
import AuthCallback from "./pages/auth/AuthCallback.jsx"
import Home from './pages/dashboard/Home'
import MyPage from './pages/user/MyPage'
import ProfileEdit from './pages/user/ProfileEdit'

function PrivateRoute({ children }) {
  return getAccessToken() ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  return getAccessToken() ? <Navigate to="/home" replace /> : children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/register/nickname" element={<PublicRoute><RegisterNickname /></PublicRoute>} />
        <Route path="/register/basic-info" element={<PublicRoute><RegisterBasicInfo /></PublicRoute>} />
        <Route path="/register/body-info" element={<PublicRoute><RegisterBodyInfo /></PublicRoute>} />
        <Route path="/register/lifestyle" element={<PublicRoute><RegisterLifestyle /></PublicRoute>} />
        <Route path="/register/sleep" element={<PublicRoute><RegisterSleep /></PublicRoute>} />
        <Route path="/register/health" element={<PublicRoute><RegisterHealth /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/user" element={<PrivateRoute><MyPage /></PrivateRoute>} />
        <Route path="/user/profile/edit" element={<PrivateRoute><ProfileEdit /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App