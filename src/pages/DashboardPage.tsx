import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { CurriculumStatusText } from '../components/StatusText.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { HomeBannerCarousel } from '../components/HomeBannerCarousel.tsx';

export const DashboardPage: React.FC = () => {
  const {
    appUser,
    studentProfile,
    boards,
    classes,
    sessions,
    streams,
    subjects,
    chapters,
    testResults,
    studyTasks,
    revisionRecords,
    announcements,
    navigate,
    updateStudyTask,
  } = useApp();

  if (!studentProfile?.onboardingCompleted) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Complete Your Study Profile
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Select your Class, Board, Academic Session, Stream, and Subjects to unlock your personalized curriculum, subject-wise tests, and AI Teacher.
        </p>
        <button
          onClick={() => navigate('onboarding')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          Set Up My Curriculum
        </button>
      </div>
    );
  }

  const board = boards.find((b) => b.id === studentProfile.boardId);
  const cls = classes.find((c) => c.id === studentProfile.classId);
  const session = sessions.find((s) => s.id === studentProfile.academicSessionId);
  const stream = streams.find((st) => st.id === studentProfile.streamId);

  const enrolledSubjects = subjects.filter((s) =>
    studentProfile.selectedSubjectIds.includes(s.id)
  );
  const effectiveSubjects =
    enrolledSubjects.length > 0
      ? enrolledSubjects
      : subjects.filter((s) => s.boardId === studentProfile.boardId && s.classId === studentProfile.classId);

  const relevantChapters = chapters.filter((ch) =>
    effectiveSubjects.some((s) => s.id === ch.subjectId && ch.published)
  );
  const completedCount = relevantChapters.filter((ch) =>
    studentProfile.completedChapterIds.includes(ch.id)
  ).length;
  const remainingCount = Math.max(0, relevantChapters.length - completedCount);
  const syllabusPct =
    relevantChapters.length > 0 ? Math.round((completedCount / relevantChapters.length) * 100) : 0;

  const nextChapter =
    relevantChapters.find((ch) => !studentProfile.completedChapterIds.includes(ch.id)) ||
    relevantChapters[0];
  const nextChapterSubject = effectiveSubjects.find((s) => s.id === nextChapter?.subjectId);

  const avgScore =
    testResults.length > 0
      ? Math.round(
          testResults.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0), 0) /
            testResults.length
        )
      : null;

  // Objective vs Written accuracy split
  let objEarned = 0;
  let objMax = 0;
  let wrEarned = 0;
  let wrMax = 0;
  const weakTopicFreq = new Map<string, number>();

  for (const res of testResults) {
    for (const wt of res.weakTopics || []) {
      weakTopicFreq.set(wt, (weakTopicFreq.get(wt) || 0) + 1);
    }
    for (const ans of res.answers || []) {
      const isWritten =
        ans.questionType === 'Short Answer' ||
        ans.questionType === 'Long Answer' ||
        ans.questionType === 'Very Short Answer' ||
        ans.questionType === 'Case-Based' ||
        ans.questionType === 'Practical';
      if (isWritten) {
        wrEarned += ans.awardedMarks;
        wrMax += ans.maxMarks;
      } else {
        objEarned += ans.awardedMarks;
        objMax += ans.maxMarks;
      }
    }
  }
  const mcqAccuracyPct = objMax > 0 ? Math.round((objEarned / objMax) * 100) : null;
  const writtenAccuracyPct = wrMax > 0 ? Math.round((wrEarned / wrMax) * 100) : null;

  // Weighted Overall Preparation %
  const overallPrepPct =
    avgScore !== null
      ? Math.round(syllabusPct * 0.5 + avgScore * 0.5)
      : syllabusPct;

  const loggedMinutes =
    (studentProfile.studyMinutesLogged || 0) +
    testResults.reduce((sum, r) => sum + (r.timeSpentMinutes || 0), 0);
  const dailyGoalMins = (studentProfile.dailyStudyHours || 3) * 60;

  const weakSubjects = effectiveSubjects.filter((s) =>
    studentProfile.weakSubjectIds.includes(s.id)
  );
  const weakTopicsList = Array.from(weakTopicFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysTasks = studyTasks
    .filter((t) => t.scheduledDate === todayIso || t.status === 'pending')
    .slice(0, 5);
  const dueRevisions = revisionRecords.filter((r) => r.nextReviewDate <= todayIso);

  const publishedAnnouncements = announcements.filter((a) => a.published);

  return (
    <div className="space-y-8">
      {/* Header Welcome with Official Brand Logo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-2">
          <BrandLogo size="md" subtitle="Official Study Workspace" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
            {board?.name} · {cls?.className}
            {stream && stream.id !== 'na' ? ` · ${stream.name}` : ''} · Session {session?.name} ·{' '}
            {studentProfile.medium} Medium
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {appUser?.displayName || 'Student'}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            {board && <CurriculumStatusText status={board.status} />}
            <span aria-hidden="true">·</span>
            <span>Goal: {studentProfile.examGoal}</span>
            <span aria-hidden="true">·</span>
            <span>Level: {studentProfile.preparationLevel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('onboarding')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Change Board / Subjects
          </button>
          <button
            onClick={() => navigate('ai-teacher')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open AI Teacher</span>
          </button>
        </div>
      </div>

      {/* Promotional Home Screen Thumbnails Carousel */}
      <HomeBannerCarousel heading="Featured Learning &amp; Exam Tools" />

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Preparation</p>
          <p className="mt-2 font-display text-2xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
            {overallPrepPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            Syllabus {syllabusPct}% · {remainingCount} chapters left
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Chapters</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {completedCount}
            <span className="text-sm font-normal text-slate-400 ml-1">/ {relevantChapters.length}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across {effectiveSubjects.length} subjects</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">MCQ vs Written Accuracy</p>
          <p className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {mcqAccuracyPct !== null ? `${mcqAccuracyPct}%` : '—'}
            <span className="text-xs font-normal text-slate-400 mx-1.5">/</span>
            {writtenAccuracyPct !== null ? `${writtenAccuracyPct}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {testResults.length} total assessments ({avgScore !== null ? `${avgScore}% avg` : 'no score yet'})
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Study Time &amp; Streak</p>
          <div className="mt-2 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {loggedMinutes} <span className="text-xs font-normal text-slate-500">min</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {studentProfile.studyStreakDays || 1} day streak · Goal {dailyGoalMins}m/day
          </p>
        </div>
      </div>

      {/* ALL Selected Subjects Interactive Grid (Zero Truncation) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            All Selected Subjects ({effectiveSubjects.length})
          </h2>
          <button
            onClick={() => navigate('tests')}
            className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Open Subject Test Hub
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {effectiveSubjects.map((subj) => {
            const subjCh = relevantChapters.filter((c) => c.subjectId === subj.id);
            const subjDone = subjCh.filter((c) => studentProfile.completedChapterIds.includes(c.id)).length;
            const subjTests = testResults.filter((r) => r.subjectId === subj.id);
            const subjAvg =
              subjTests.length > 0
                ? Math.round(subjTests.reduce((a, b) => a + b.accuracy, 0) / subjTests.length)
                : null;
            const isWeak = studentProfile.weakSubjectIds.includes(subj.id);

            return (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-500">{subj.subjectCode}</span>
                    {isWeak ? (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Needs Focus</span>
                    ) : (
                      <span className="text-slate-500 tabular-nums">
                        {subjAvg !== null ? `Score ${subjAvg}%` : 'Ready'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {subj.subjectName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {subjDone}/{subjCh.length} chapters done · {subjTests.length} tests completed
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate('subject-detail', { subjectId: subj.id })}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Chapters
                  </button>
                  <button
                    onClick={() => navigate('mcq-test', { subjectId: subj.id, testCategory: 'Chapter Test' })}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    Take Test
                  </button>
                  <button
                    onClick={() => navigate('ai-teacher', { subjectId: subj.id })}
                    className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg cursor-pointer"
                  >
                    AI Teacher
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Continue Learning + Today's Tasks + Recent Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* Continue Learning */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Continue Learning
              </h2>
              <button
                onClick={() => navigate('subjects')}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                All Subjects
              </button>
            </div>

            {nextChapter && nextChapterSubject ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {nextChapterSubject.subjectName} · Chapter {nextChapter.chapterNumber}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                    {nextChapter.chapterName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {nextChapter.introduction}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={() =>
                      navigate('chapter-learning', {
                        subjectId: nextChapterSubject.id,
                        chapterId: nextChapter.id,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Study Chapter</span>
                  </button>
                  <button
                    onClick={() =>
                      navigate('ai-teacher', {
                        subjectId: nextChapterSubject.id,
                        chapterId: nextChapter.id,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Teach with AI</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select subjects in your study profile to load chapters.
              </p>
            )}
          </div>

          {/* Today's Study Tasks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Today’s Study Planner Tasks
              </h2>
              <button
                onClick={() => navigate('study-planner')}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open Planner
              </button>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <Calendar className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No timetable tasks scheduled yet. Generate a realistic 30, 60, or 90-day plan around your school hours.
                </p>
                <button
                  onClick={() => navigate('study-planner')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                >
                  Create Study Plan
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todaysTasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                    <label className="flex items-start gap-3 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() =>
                          updateStudyTask({
                            ...task,
                            status: task.status === 'completed' ? 'pending' : 'completed',
                          })
                        }
                        className="mt-1 rounded border-slate-300 accent-indigo-700"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            task.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {task.subjectName} · {task.taskType} · {task.timeSlot} ({task.durationMinutes} min)
                        </p>
                      </div>
                    </label>
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        task.status === 'completed'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : task.status === 'overdue'
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {task.status === 'completed' ? 'Done' : task.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Mock & Test Results */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Recent Test &amp; Mock Results
              </h2>
              <button
                onClick={() => navigate('progress')}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Full Analytics
              </button>
            </div>

            {testResults.length === 0 ? (
              <div className="py-5 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You haven’t completed a subject test or mock exam yet.
                </p>
                <button
                  onClick={() => navigate('tests')}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                >
                  Take First Practice Test
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="pb-2 font-medium">Assessment</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium text-right">Score</th>
                      <th className="pb-2 font-medium text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {testResults.slice(0, 5).map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => navigate('test-results', { resultId: r.id })}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <td className="py-2.5 font-medium text-slate-900 dark:text-white pr-3">
                          {r.title}
                        </td>
                        <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400 pr-3">
                          {r.testType}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {r.score}/{r.totalMarks}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {Math.round(r.accuracy)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Weak Chapters/Topics + Revision + Mock Exams + Announcements */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weak Chapters & Weak Topics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Weak Topics &amp; Revision Priority
            </h2>
            {weakTopicsList.length === 0 && weakSubjects.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No weak chapters flagged yet. Take tests across your subjects to surface targeted revision priorities.
              </p>
            ) : (
              <div className="space-y-2">
                {weakTopicsList.map(([topic, count]) => (
                  <div
                    key={topic}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{topic}</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Missed in {count} {count === 1 ? 'assessment' : 'assessments'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('ai-teacher', { aiInitialTopic: `Please revise and clarify "${topic}" with examples.` })}
                      className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                    >
                      Ask AI
                    </button>
                  </div>
                ))}
                {weakSubjects.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => navigate('subject-detail', { subjectId: ws.id })}
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {ws.subjectName}
                      </p>
                      <p className="text-xs text-slate-500">Flagged focus subject</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spaced Revision Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Revision Schedule
              </h2>
              <button
                onClick={() => navigate('revision')}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open Revision
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                {revisionRecords.length} chapters in spaced cycle
              </span>
              <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                {dueRevisions.length} due today
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Daily study goal: {studentProfile.dailyStudyHours || 3} hours/day</span>
            </div>
          </div>

          {/* All Selected Subject Mock Exams Ready */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Board Mock Tests Ready
            </h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {effectiveSubjects.map((subj) => (
                <div
                  key={subj.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {subj.subjectName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {subj.theoryMarks} Marks · {subj.examDurationMinutes} mins
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('mock-exam', { subjectId: subj.id })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg shrink-0 cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Start Mock</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Academic Notices
            </h2>
            <div className="space-y-3">
              {publishedAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="pt-3 first:pt-0 border-t first:border-t-0 border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                    <span>{ann.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
