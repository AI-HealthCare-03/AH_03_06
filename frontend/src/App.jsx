import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AuthCallback from "./pages/auth/AuthCallback.jsx";
import Home from './pages/dashboard/Home'
import MyPage from './pages/user/MyPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<Home />} />
        <Route path="/user" element={<MyPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App