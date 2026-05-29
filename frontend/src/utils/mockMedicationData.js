// ============================================================
// utils/mockMedicationData.js
// 화면 기반 Mock 데이터
// ============================================================

// ────────────────────────────────────────────────────────────
// [Image 1] 복약 관리 목록 Mock 데이터
// ────────────────────────────────────────────────────────────

export const MOCK_MEDICATIONS = [
  // ① 처방약 - 아모잘탄정 5mg (고혈압)
  {
    id: 'med-001',
    name: '아모잘탄정 5mg',
    category: '처방약',
    description: '고혈압 치료제',
    schedule: {
      isAsNeeded: false,
      slots: [
        {
          mealTime: '아침',
          timing: '식후',
          timingMinutes: 30,
          clockTime: '08:00',
          dosageAmount: 1,
          dosageUnit: '정',
        },
      ],
    },
    startDate: '2026-04-15',
    status: '진행 중',
  },

  // ② 처방약 - 메트포르민 500mg (당뇨병)
  {
    id: 'med-002',
    name: '메트포르민 500mg',
    category: '처방약',
    description: '당뇨병 치료제',
    schedule: {
      isAsNeeded: false,
      slots: [
        {
          mealTime: '아침',
          timing: '식후',
          timingMinutes: 30,
          clockTime: '08:00',
          dosageAmount: 1,
          dosageUnit: '정',
        },
      ],
    },
    startDate: '2026-04-15',
    status: '진행 중',
  },

  // ③ 일반의약품 - 종합비타민 (영양보충)
  {
    id: 'med-003',
    name: '종합비타민',
    category: '일반의약품',
    description: '영양보충제',
    schedule: {
      isAsNeeded: false,
      slots: [
        {
          mealTime: '점심',
          timing: '식후',
          timingMinutes: undefined,
          clockTime: '12:00',
          dosageAmount: 1,
          dosageUnit: '정',
        },
      ],
    },
    startDate: '2026-05-01',
    status: '진행 중',
  },

  // ④ 일반의약품 - 타이레놀정 500mg (해열진통, 필요시)
  {
    id: 'med-004',
    name: '타이레놀정 500mg',
    category: '일반의약품',
    description: '해열진통제',
    schedule: {
      isAsNeeded: true,
      slots: [
        {
          mealTime: '필요시',
          timing: '무관',
          timingMinutes: undefined,
          clockTime: '19:00',
          dosageAmount: 1,
          dosageUnit: '정',
        },
      ],
    },
    startDate: '2026-05-10',
    status: '진행 중',
  },

  // ────────────────────────────────────────────────────────
  // [복약 종료] 탭 샘플 데이터 (2건)
  // ────────────────────────────────────────────────────────

  // ⑤ 종료된 처방약
  {
    id: 'med-005',
    name: '아지트로마이신 250mg',
    category: '처방약',
    description: '항생제',
    schedule: {
      isAsNeeded: false,
      slots: [
        {
          mealTime: '아침',
          timing: '식후',
          timingMinutes: 30,
          clockTime: '08:00',
          dosageAmount: 1,
          dosageUnit: '정',
        },
      ],
    },
    startDate: '2026-03-01',
    endDate: '2026-03-07',
    status: '종료',
  },

  // ⑥ 종료된 일반의약품
  {
    id: 'med-006',
    name: '판콜에이내복액',
    category: '일반의약품',
    description: '감기약',
    schedule: {
      isAsNeeded: false,
      slots: [
        {
          mealTime: '아침',
          timing: '식후',
          timingMinutes: 30,
          clockTime: '08:00',
          dosageAmount: 1,
          dosageUnit: '포',
        },
        {
          mealTime: '저녁',
          timing: '식후',
          timingMinutes: 30,
          clockTime: '19:00',
          dosageAmount: 1,
          dosageUnit: '포',
        },
      ],
    },
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    status: '종료',
  },
];

// ────────────────────────────────────────────────────────────
// [Image 2] 오늘의 복약 Mock 데이터
// ────────────────────────────────────────────────────────────

export const MOCK_TODAY_MEDICATION = {
  date: '2026-05-12',
  dateLabel: '2026년 5월 12일 화요일',
  totalCount: 4,
  completedCount: 3,
  completionRate: 75,
  groups: [
    // 아침 (완료)
    {
      mealTime: '아침',
      clockTime: '오전 8:00',
      timing: '식후 30분',
      completionStatus: '완료',
      entries: [
        {
          medicationId: 'med-001',
          medicationName: '아모잘탄정 5mg',
          categoryLabel: '고혈압약',
          dosageAmount: 1,
          dosageUnit: '정',
          completionStatus: '완료',
          scheduledTime: '08:00',
          takenAt: '08:12',
        },
        {
          medicationId: 'med-002',
          medicationName: '메트포르민 500mg',
          categoryLabel: '당뇨병약',
          dosageAmount: 1,
          dosageUnit: '정',
          completionStatus: '완료',
          scheduledTime: '08:00',
          takenAt: '08:12',
        },
      ],
    },

    // 점심 (완료)
    {
      mealTime: '점심',
      clockTime: '오후 12:00',
      timing: '식후 30분',
      completionStatus: '완료',
      entries: [
        {
          medicationId: 'med-003',
          medicationName: '종합비타민',
          categoryLabel: '영양제',
          dosageAmount: 1,
          dosageUnit: '정',
          completionStatus: '완료',
          scheduledTime: '12:00',
          takenAt: '12:35',
        },
      ],
    },

    // 저녁 (예정)
    {
      mealTime: '저녁',
      clockTime: '오후 7:00',
      timing: '식후 30분',
      completionStatus: '예정',
      entries: [
        {
          medicationId: 'med-004',
          medicationName: '타이레놀정 500mg',
          categoryLabel: '진통제',
          dosageAmount: 1,
          dosageUnit: '정',
          completionStatus: '예정',
          scheduledTime: '19:00',
          takenAt: undefined,
        },
      ],
    },
  ],
};

export const MOCK_CALENDAR = {
  year: 2026,
  month: 5,
  doneDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 15, 16, 17, 18],
  missedDays: [10, 13],
  selectedDay: 12,
};

export const MOCK_ANALYSIS = {
  periodLabel: '최근 30일',
  achievementRate: 85,
};

export const MOCK_MEDICATIONS_BY_DATE = {
  '2026-05-28': {
    date: '2026-05-28',
    dateLabel: '5월 28일 목요일',
    totalCount: 4,
    doneCount: 2,
    timeSlots: [
      {
        id: 'morning',
        label: '아침',
        time: '오전 8:00',
        icon: 'sun',
        medications: [
          { id: 'med-001', name: '아모잘탄정 5mg',   dosage: '1정', category: '고혈압약', timing: '식후 30분', type: 'prescription', status: 'done'    },
          { id: 'med-002', name: '메트포르민 500mg', dosage: '1정', category: '당뇨병약', timing: '식후 30분', type: 'prescription', status: 'done'    },
        ],
      },
      {
        id: 'lunch',
        label: '점심',
        time: '오후 12:00',
        icon: 'clock',
        medications: [
          { id: 'med-003', name: '종합비타민',        dosage: '1정', category: '영양제',  timing: '식후 30분', type: 'supplement',   status: 'pending'  },
        ],
      },
      {
        id: 'evening',
        label: '저녁',
        time: '오후 7:00',
        icon: 'moon',
        medications: [
          { id: 'med-004', name: '타이레놀 500mg',   dosage: '1정', category: '진통제',  timing: '식관계없음', type: 'supplement',  status: 'scheduled' },
        ],
      },
    ],
  },
};