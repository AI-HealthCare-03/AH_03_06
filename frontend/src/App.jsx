import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RegisterNickname from './pages/auth/RegisterNickname'
import RegisterProfile from './pages/auth/RegisterProfile'
import AuthCallback from "./pages/auth/AuthCallback.jsx";
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
        <Route path="/register/profile" element={<RegisterProfile />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<Home />} />
        <Route path="/user" element={<MyPage />} />
        <Route path="/user/profile/edit" element={<ProfileEdit />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App