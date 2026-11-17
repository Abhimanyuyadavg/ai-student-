import type { BannerDestinationPage, HomeBanner } from '../types/index.ts';

export const PERSONAL_PHOTO_PRIMARY = '/assets/aistudio/IMG-20261113-WA0006_e29e110e.jpg';
export const PERSONAL_PHOTO_THUMBS_UP = '/assets/aistudio/file_000000004b688211950ff88f9bea5c5e_90e4fe39.png';

export const BANNER_DESTINATION_OPTIONS: { value: BannerDestinationPage; label: string }[] = [
  { value: 'subjects', label: 'All Subjects & Learning' },
  { value: 'ai-teacher', label: 'AI Personal Teacher' },
  { value: 'tests', label: 'Board Exams & Mock Tests' },
  { value: 'study-planner', label: 'Study Planner & Daily Goals' },
  { value: 'progress', label: 'My Progress & Performance Reports' },
  { value: 'question-bank', label: 'Question Bank' },
  { value: 'pyq-bank', label: 'Previous Year Papers (PYQ)' },
  { value: 'revision', label: 'Revision & Memory' },
  { value: 'library', label: 'Study Library' },
];

export const SEED_HOME_BANNERS: HomeBanner[] = [
  {
    id: 'banner_welcome',
    title: 'WELCOME TO AI STUDENTS',
    subtitle: 'Your Smart Study Partner\nLearn Smart • Practise More • Improve Every Day',
    ctaLabel: 'Start Learning',
    imageUrl: PERSONAL_PHOTO_THUMBS_UP,
    destinationPage: 'subjects',
    orderIndex: 1,
    enabled: true,
    accentTheme: 'blue-purple',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
  {
    id: 'banner_ai_teacher',
    title: 'YOUR PERSONAL AI TEACHER',
    subtitle: 'Learn Every Subject with AI\nAsk Doubts • Get Answers • Learn Easily',
    ctaLabel: 'Explore AI Teacher',
    imageUrl: PERSONAL_PHOTO_THUMBS_UP,
    destinationPage: 'ai-teacher',
    orderIndex: 2,
    enabled: true,
    accentTheme: 'indigo-gold',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
  {
    id: 'banner_complete_learning',
    title: 'COMPLETE CHAPTER-WISE LEARNING',
    subtitle:
      'Mathematics • Science • Social Science • Hindi • English • Sanskrit\nClass 11 & 12: Physics, Chemistry, Biology, Accountancy, Economics & History',
    ctaLabel: 'Explore Subjects',
    imageUrl: PERSONAL_PHOTO_THUMBS_UP,
    destinationPage: 'subjects',
    orderIndex: 3,
    enabled: true,
    accentTheme: 'cobalt-subjects',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
  {
    id: 'banner_smart_tests',
    title: 'PRACTISE • TEST • IMPROVE',
    subtitle:
      'MCQ Tests • Written Tests • Previous Year Questions • Mock Exams\nSubject-Wise Assessments for BSEB, CBSE & ICSE Boards',
    ctaLabel: 'Take a Test',
    imageUrl: PERSONAL_PHOTO_THUMBS_UP,
    destinationPage: 'tests',
    orderIndex: 4,
    enabled: true,
    accentTheme: 'royal-amber',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
  {
    id: 'banner_study_planner',
    title: 'PLAN YOUR STUDY, TRACK YOUR PROGRESS',
    subtitle:
      'Daily Goals • Revision • Performance Reports • Smart Study Planner\nBuild Consistency Across All Chapters & Mock Exams',
    ctaLabel: 'Open Study Planner',
    imageUrl: PERSONAL_PHOTO_THUMBS_UP,
    destinationPage: 'study-planner',
    orderIndex: 5,
    enabled: true,
    accentTheme: 'violet-blue',
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
];
