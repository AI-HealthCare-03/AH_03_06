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
        // ===== 기존 토큰 (보존 — 기존 코드 영향 없음) =====
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          soft: '#EFF6FF',
        },
        text: {
          body: '#18181B',
          sub: '#71717A',
        },

        // ===== S-701 시안 평면 토큰 (디자인 시스템 통일용 — 신규 화면부터 적용) =====
        // 원칙: Primary 단 1개, 건강 상태만 warning/error 예외 허용.
        primaryDark: '#1D4ED8',
        primarySoft: '#EFF6FF',

        // Neutral
        // C-6 절충: 본문 기준값을 실사용 우세값(#18181B)으로 맞춤. 레거시 text.* 제거·전면 치환은 회의 후.
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
        // 정상/성공 — 기존엔 토큰 없이 raw green이 흩어져 있어 신설(코드 실측값 기준: green-600/green-50)
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