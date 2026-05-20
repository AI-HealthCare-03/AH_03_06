import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAccessToken, setRefreshToken } from '../../utils/token.js'
import { loginSuccess } from '../../App.jsx'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      setAccessToken(accessToken)
      setRefreshToken(refreshToken)
      loginSuccess()
      navigate('/home', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="w-full min-h-[100dvh] flex items-center justify-center">
      <p className="text-[14px] text-[#71717A]">로그인 처리 중...</p>
    </div>
  )
}

export default AuthCallback