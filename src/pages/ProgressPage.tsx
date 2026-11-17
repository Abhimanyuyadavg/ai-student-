import React from 'react';
import { Award, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const ProgressPage: React.FC = () => {
  const { studentProfile, subjects, chapters, testResults, revisionRecords, navigate } = useApp();

  const enrolledSubjects = subjects.filter((s) =>
    studentProfile?.selectedSubjectIds?.length
      ? studentProfile.selectedSubjectIds.includes(s.id)
      : s.boardId === (studentProfile?.boardId || 'bseb') && s.classId === (studentProfile?.classId || 'class_10')
  );

  const relevantChapters = chapters.filter((c) => enrolledSubjects.some((s) => s.id === c.subjectId && c.published));
  const completedCount = relevantChapters.filter((c) =>
    studentProfile?.completedChapterIds?.includes(c.id)
  ).length;
  const completionPct = relevantChapters.length > 0 ? Math.round((completedCount / relevantChapters.length) * 100) : 0;

  const avgAccuracy =
    testResults.length > 0
      ? Math.round(testResults.reduce((acc, r) => acc + r.accuracy, 0) / testResults.length)
      : 0;

  const totalStudyMins =
    (studentProfile?.studyMinutesLogged || 0) +
    testResults.reduce((acc, r) => acc + (r.timeSpentMinutes || 0), 0);

  // MCQ / Objective vs Written Accuracy calculation
  let objEarned = 0;
  let objMax = 0;
  let wrEarned = 0;
  let wrMax = 0;
  const weakTopicsFreq = new Map<string, number>();

  for (const r of testResults) {
    for (const wt of r.weakTopics || []) {
      weakTopicsFreq.set(wt, (weakTopicsFreq.get(wt) || 0) + 1);
    }
    for (const ans of r.answers || []) {
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
  const mcqAccuracy = objMax > 0 ? Math.round((objEarned / objMax) * 100) : null;
  const writtenAccuracy = wrMax > 0 ? Math.round((wrEarned / wrMax) * 100) : null;

  // Subject-wise accuracy
  const subjectStats = enrolledSubjects.map((subj) => {
    const subjTests = testResults.filter((r) => r.subjectId === subj.id);
    const subjChs = relevantChapters.filter((c) => c.subjectId === subj.id);
    const subjDone = subjChs.filter((c) => studentProfile?.completedChapterIds?.includes(c.id)).length;
    const avg =
      subjTests.length > 0
        ? Math.round(subjTests.reduce((a, b) => a + b.accuracy, 0) / subjTests.length)
        : 0;
    return { subject: subj, avg, testCount: subjTests.length, done: subjDone, totalCh: subjChs.length };
  });

  const improvingSubject = subjectStats.find((s) => s.avg >= 75)?.subject.subjectName;
  const lowAccuracySubject = subjectStats.find((s) => s.testCount > 0 && s.avg < 65)?.subject.subjectName;
  const trendPoints = [...testResults].reverse().slice(-8);
  const weakTopicsList = Array.from(weakTopicsFreq.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          My Progress &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track chapter mastery, objective vs written accuracy, weak topics, subject-wise scores, and revision milestones.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Chapter Completion</span>
            <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">{completionPct}%</p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {completedCount} of {relevantChapters.length} chapters
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Average Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">
            {testResults.length > 0 ? `${avgAccuracy}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            MCQ {mcqAccuracy !== null ? `${mcqAccuracy}%` : '—'} · Written{' '}
            {writtenAccuracy !== null ? `${writtenAccuracy}%` : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Revision Cycles</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">{revisionRecords.length}</p>
          <p className="text-xs text-slate-500 mt-1">Chapters in spaced review</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Study Time</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">{totalStudyMins} mins</p>
          <p className="text-xs text-slate-500 mt-1">Logged AI study &amp; tests</p>
        </div>
      </div>

      {/* Encouraging Recommendations & Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Personalized Study Guidance
          </h2>
          <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-5">
            {improvingSubject ? (
              <li>Your {improvingSubject} performance is strong and improving steadily. Keep revising weekly to retain mastery.</li>
            ) : (
              <li>Take a chapter or written practice test across your subjects to unlock strength insights.</li>
            )}
            {lowAccuracySubject && (
              <li>
                Revise chapters in {lowAccuracySubject} where accuracy is lower, and use AI Teacher’s Step 5 (Simpler Language Breakdown) before retrying.
              </li>
            )}
            <li>Consistent daily sessions of {studentProfile?.dailyStudyHours || 3} hours with short breaks beat last-minute cramming.</li>
          </ul>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Weak Topics to Revise ({weakTopicsList.length})
          </h2>
          {weakTopicsList.length === 0 ? (
            <p className="text-xs text-slate-500">No weak topics detected yet.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {weakTopicsList.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{topic}</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono">
                    {count}x flagged
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Recent Test Accuracy Trend
          </h2>
          {trendPoints.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-sm text-slate-500">Complete tests to plot your accuracy progress over time.</p>
              <button
                onClick={() => navigate('tests')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
              >
                Take a Test
              </button>
            </div>
          ) : (
            <div className="h-48 flex items-end gap-3 pt-4 border-b border-slate-200 dark:border-slate-800">
              {trendPoints.map((pt, i) => (
                <div key={pt.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {Math.round(pt.accuracy)}%
                  </span>
                  <div
                    style={{ height: `${Math.max(8, Math.round(pt.accuracy))}%` }}
                    className="w-full max-w-[36px] bg-indigo-700 dark:bg-indigo-500 rounded-t-md"
                    title={`${pt.title}: ${Math.round(pt.accuracy)}%`}
                  />
                  <span className="text-[10px] font-mono text-slate-400">T{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Subject-Wise Performance &amp; Chapters
          </h2>
          <div className="space-y-3.5">
            {subjectStats.map(({ subject, avg, testCount, done, totalCh }) => (
              <div key={subject.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                    {subject.subjectName}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {done}/{totalCh} ch · {testCount > 0 ? `${avg}% (${testCount} tests)` : 'No tests yet'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${avg}%` }}
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Mock & Assessment History */}
      {testResults.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Recent Mock &amp; Test Results
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right">Accuracy</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {testResults.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{r.title}</td>
                    <td className="py-2.5 text-slate-500">{r.testType}</td>
                    <td className="py-2.5 text-slate-500 tabular-nums">
                      {new Date(r.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {r.score}/{r.totalMarks}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {Math.round(r.accuracy)}%
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => navigate('test-results', { resultId: r.id })}
                        className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
