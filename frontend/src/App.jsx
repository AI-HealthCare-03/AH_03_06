import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { getAccessToken, clearTokens } from './utils/token.js'
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
import All from './pages/all/All'
import MyPage from './pages/user/MyPage'
import ProfileEdit from './pages/user/ProfileEdit'

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
        <Route path="/user" element={<PrivateRoute auth={auth}><MyPage /></PrivateRoute>} />
        <Route path="/user/profile/edit" element={<PrivateRoute auth={auth}><ProfileEdit /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App