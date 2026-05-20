import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/nickname" element={<RegisterNickname />} />
        <Route path="/register/basic-info" element={<RegisterBasicInfo />} />
        <Route path="/register/body-info" element={<RegisterBodyInfo />} />
        <Route path="/register/lifestyle" element={<RegisterLifestyle />} />
        <Route path="/register/sleep" element={<RegisterSleep />} />
        <Route path="/register/health" element={<RegisterHealth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<Home />} />
        <Route path="/user" element={<MyPage />} />
        <Route path="/user/profile/edit" element={<ProfileEdit />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App