/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Pretendard', 'sans-serif'],
    },
    extend: {
      colors: {
        // 기존 토큰 (보존 — 기존 코드 영향 없음)
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          soft: '#EFF6FF',
        },
        text: {
          body: '#18181B',
          sub: '#71717A',
        },

        // 디자인 시스템 토큰 (신규 화면부터 적용)
        // 원칙: Primary 단 1개, 건강 상태만 warning/error 예외 허용.
        primaryDark: '#1D4ED8',
        primarySoft: '#EFF6FF',

        // Neutral
        // 본문 기준색 #18181B로 통일 (레거시 text.* 토큰은 추후 정리)
        textBody: '#18181B',
        textHeading: '#18181B',
        subtext: '#52525B',
        mute: '#A1A1AA',
        borderStrong: '#D4D4D8',
        borderHairline: '#E4E4E7',
        borderLight: '#F4F4F5',
        bgSubtle: '#FAFAFA',

        // 예외: 건강 상태 뱃지/카드 전용
        warning: '#F59E0B',
        warningSoft: '#FEF3C7',
        error: '#DC2626',
        errorSoft: '#FEE2E2',
        // 정상/성공
        success: '#16A34A',
        successSoft: '#F0FDF4',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        card: '0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)',
      },
    }
  },
  plugins: [],
}