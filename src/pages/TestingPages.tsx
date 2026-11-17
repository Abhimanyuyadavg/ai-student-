import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  EvaluatedAnswerItem,
  Question,
  TestCategory,
  TestResult,
} from '../types/index.ts';
import { PriorityText } from '../components/StatusText.tsx';

const TEST_CATEGORIES: { id: TestCategory; desc: string }[] = [
  { id: 'Chapter Test', desc: 'Focused assessment for a single chapter of this subject.' },
  { id: 'Topic Test', desc: 'Drill one specific topic inside the selected chapter.' },
  { id: 'Daily Practice Test', desc: 'Quick 5-question daily recall sprint.' },
  { id: 'Weekly Test', desc: 'Mixed-format weekly progress check across chapters.' },
  { id: 'Full Subject Test', desc: 'Comprehensive multi-chapter subject test.' },
  { id: 'Previous Year Question Test', desc: 'Verified board PYQs (or clearly labeled practice if none uploaded).' },
  { id: 'Board Pattern Mock Exam', desc: 'Timed examination matching board blueprint.' },
  { id: 'Revision Test', desc: 'Targeted re-test on weak topics and missed questions.' },
];

const WRITTEN_TYPES = new Set([
  'Very Short Answer',
  'Short Answer',
  'Long Answer',
  'Case-Based',
  'Practical',
]);

function isAiPracticeItem(q: Question): boolean {
  return Boolean(q.aiGenerated || (!q.isPyq && q.sourceType === 'Predicted Practice'));
}

function normalizeTextAnswer(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

function shuffleDeterministic<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 1000003;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    const j = seed % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function parseMatchAnswers(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function parseMultiAnswers(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw ? [raw] : [];
  }
}

function gradeObjectiveQuestion(
  q: Question,
  rawAnswer: string
): {
  answered: boolean;
  isCorrect: boolean;
  awardedMarks: number;
  studentDisplay: string;
  correctDisplay: string;
} {
  const trimmed = (rawAnswer || '').trim();
  if (q.questionType === 'Multiple Correct') {
    const picked = parseMultiAnswers(rawAnswer);
    const expected = q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : q.correctAnswer ? [q.correctAnswer] : [];
    const expectedSet = new Set(expected);
    const pickedSet = new Set(picked);
    const allMatch =
      expectedSet.size > 0 &&
      pickedSet.size === expectedSet.size &&
      Array.from(expectedSet).every((x) => pickedSet.has(x));
    return {
      answered: picked.length > 0,
      isCorrect: allMatch,
      awardedMarks: allMatch ? q.marks : 0,
      studentDisplay: picked.length > 0 ? picked.join(', ') : 'Not answered',
      correctDisplay: expected.join(', '),
    };
  }

  if (q.questionType === 'Match the Following' && q.matchPairs && q.matchPairs.length > 0) {
    const map = parseMatchAnswers(rawAnswer);
    const totalPairs = q.matchPairs.length;
    let rightCount = 0;
    for (const pair of q.matchPairs) {
      if (map[pair.left] === pair.right) rightCount += 1;
    }
    const allCorrect = rightCount === totalPairs;
    const partialMarks = Math.round((rightCount / totalPairs) * q.marks * 2) / 2;
    return {
      answered: Object.keys(map).length > 0,
      isCorrect: allCorrect,
      awardedMarks: partialMarks,
      studentDisplay:
        Object.keys(map).length > 0
          ? q.matchPairs.map((p) => `${p.left} -> ${map[p.left] || '?'}`).join('; ')
          : 'Not answered',
      correctDisplay: q.matchPairs.map((p) => `${p.left} -> ${p.right}`).join('; '),
    };
  }

  if (q.questionType === 'Fill in the Blanks') {
    const acceptable = (q.correctAnswer || '')
      .split('/')
      .map((s) => normalizeTextAnswer(s))
      .filter(Boolean);
    const normPicked = normalizeTextAnswer(trimmed);
    const matched = Boolean(normPicked) && acceptable.includes(normPicked);
    return {
      answered: Boolean(trimmed),
      isCorrect: matched,
      awardedMarks: matched ? q.marks : 0,
      studentDisplay: trimmed || 'Not answered',
      correctDisplay: q.correctAnswer || '',
    };
  }

  // Standard single-choice (MCQ, True/False, Diagram-Based, or exact Numerical)
  const expected = (q.correctAnswer || '').trim();
  const isCorrect =
    Boolean(trimmed) &&
    (q.questionType === 'Numerical'
      ? normalizeTextAnswer(trimmed) === normalizeTextAnswer(expected)
      : trimmed === expected);
  return {
    answered: Boolean(trimmed),
    isCorrect,
    awardedMarks: isCorrect ? q.marks : 0,
    studentDisplay: trimmed || 'Not answered',
    correctDisplay: expected,
  };
}

export const TestsHubPage: React.FC = () => {
  const {
    studentProfile,
    subjects,
    chapters,
    topics,
    questions,
    customTests,
    testResults,
    navigate,
  } = useApp();

  const enrolledSubjects = useMemo(() => {
    const boardId = studentProfile?.boardId || 'bseb';
    const classId = studentProfile?.classId || 'class_10';
    const base = subjects.filter((s) => s.boardId === boardId && s.classId === classId);
    if (studentProfile?.selectedSubjectIds?.length) {
      const sel = base.filter((s) => studentProfile.selectedSubjectIds.includes(s.id));
      if (sel.length > 0) return sel;
    }
    return base.length > 0 ? base : subjects;
  }, [subjects, studentProfile]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    enrolledSubjects[0]?.id || subjects[0]?.id || ''
  );

  useEffect(() => {
    if (enrolledSubjects.length > 0 && !enrolledSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(enrolledSubjects[0].id);
    }
  }, [enrolledSubjects, selectedSubjectId]);

  const subjChapters = useMemo(
    () => chapters.filter((c) => c.subjectId === selectedSubjectId && c.published),
    [chapters, selectedSubjectId]
  );

  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TestCategory>('Chapter Test');
  const [initialMode, setInitialMode] = useState<'learning' | 'exam'>('learning');
  const [historyFilterSubject, setHistoryFilterSubject] = useState<string>('all');

  useEffect(() => {
    if (selectedChapterId && !subjChapters.some((c) => c.id === selectedChapterId)) {
      setSelectedChapterId('');
      setSelectedTopicName('');
    }
  }, [subjChapters, selectedChapterId]);

  const chapterTopics = useMemo(() => {
    if (!selectedChapterId) return [];
    const fromTopics = topics.filter((t) => t.chapterId === selectedChapterId).map((t) => t.topicName);
    const fromQ = questions
      .filter((q) => q.chapterId === selectedChapterId && q.subjectId === selectedSubjectId)
      .map((q) => q.topicName);
    return Array.from(new Set([...fromTopics, ...fromQ]));
  }, [topics, questions, selectedChapterId, selectedSubjectId]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const matchingCustomTests = useMemo(() => {
    const boardId = studentProfile?.boardId || selectedSubject?.boardId || 'bseb';
    const classId = studentProfile?.classId || selectedSubject?.classId || 'class_10';
    return customTests.filter(
      (ct) =>
        ct.published &&
        (ct.boardId === 'all' || ct.boardId === boardId) &&
        (ct.classId === 'all' || ct.classId === classId) &&
        (ct.subjectId === 'all' || ct.subjectId === selectedSubjectId)
    );
  }, [customTests, studentProfile, selectedSubject, selectedSubjectId]);

  const filteredHistory = useMemo(() => {
    if (historyFilterSubject === 'all') return testResults;
    return testResults.filter((r) => r.subjectId === historyFilterSubject);
  }, [testResults, historyFilterSubject]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Subject-Wise Tests &amp; Mock Examinations
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Every subject has its own dedicated question bank, multi-format interactive test engine, written answer rubric checker, and board mock exam.
        </p>
      </div>

      {/* Dedicated Test Center for Every Selected Subject */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Your Selected Subjects ({enrolledSubjects.length})
          </h2>
          <button
            onClick={() => navigate('onboarding')}
            className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Manage Subjects
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledSubjects.map((subj) => {
            const bankCount = questions.filter((q) => q.subjectId === subj.id && q.published).length;
            const subjChCount = chapters.filter((c) => c.subjectId === subj.id && c.published).length;
            const attempts = testResults.filter((r) => r.subjectId === subj.id);
            const avgAcc =
              attempts.length > 0
                ? Math.round(attempts.reduce((a, b) => a + b.accuracy, 0) / attempts.length)
                : null;
            const isSelected = subj.id === selectedSubjectId;

            return (
              <div
                key={subj.id}
                className={`bg-white dark:bg-slate-900 rounded-xl p-5 border flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{subj.subjectCode}</span>
                    <span className="tabular-nums">
                      {avgAcc !== null ? `Avg ${avgAcc}%` : 'No attempts yet'}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {subj.subjectName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {subjChCount} Chapters · {bankCount} Bank Questions · {attempts.length}{' '}
                    {attempts.length === 1 ? 'Test Taken' : 'Tests Taken'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() =>
                      navigate('mcq-test', {
                        subjectId: subj.id,
                        testCategory: 'Chapter Test',
                        initialTestMode: 'learning',
                      })
                    }
                    className="flex-1 px-2.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Start Test
                  </button>
                  <button
                    onClick={() => navigate('written-test', { subjectId: subj.id })}
                    className="px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Written
                  </button>
                  <button
                    onClick={() => navigate('mock-exam', { subjectId: subj.id })}
                    className="px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Mock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assessment Configurator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Custom Test Launcher {selectedSubject ? `— ${selectedSubject.subjectName}` : ''}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Questions stay strictly locked to the selected subject. When a specific chapter/topic needs more questions, syllabus practice items are generated automatically.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setInitialMode('learning')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                initialMode === 'learning' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Practice Mode
            </button>
            <button
              type="button"
              onClick={() => setInitialMode('exam')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                initialMode === 'exam' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Exam Mode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedChapterId('');
                setSelectedTopicName('');
              }}
              className="w-full px-3 py-2 text-sm leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {enrolledSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Test Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TestCategory)}
              className="w-full px-3 py-2 text-sm leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {TEST_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Chapter
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                setSelectedTopicName('');
              }}
              className="w-full px-3 py-2 text-sm leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">All Subject Chapters</option>
              {subjChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.chapterNumber}: {c.chapterName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Topic (Optional)
            </label>
            <select
              value={selectedTopicName}
              onChange={(e) => setSelectedTopicName(e.target.value)}
              disabled={!selectedChapterId}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
            >
              <option value="">All Topics in Chapter</option>
              {chapterTopics.map((tn) => (
                <option key={tn} value={tn}>
                  {tn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selected Mode: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCategory}</span> —{' '}
          {TEST_CATEGORIES.find((c) => c.id === selectedCategory)?.desc}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Interactive Multi-Format Test
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Includes MCQs, Multiple Correct, True/False, Fill in the Blanks, Match the Following, and Diagram Questions for {selectedSubject?.subjectName}.
              </p>
            </div>
            <button
              onClick={() =>
                navigate(selectedCategory === 'Board Pattern Mock Exam' ? 'mock-exam' : 'mcq-test', {
                  subjectId: selectedSubjectId,
                  chapterId: selectedChapterId || undefined,
                  topicName: selectedTopicName || undefined,
                  testCategory: selectedCategory,
                  initialTestMode: initialMode,
                })
              }
              className="w-full py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Launch {selectedCategory}
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Written Answer Check
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Write short answers, long answers, or numerical solutions for {selectedSubject?.subjectName} and get strict rubric-based grading.
              </p>
            </div>
            <button
              onClick={() =>
                navigate('written-test', {
                  subjectId: selectedSubjectId,
                  chapterId: selectedChapterId || undefined,
                })
              }
              className="w-full py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Start Written Practice
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Board Pattern Mock Exam
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Timed section-wise exam combining objective and written questions with AI evaluation and question navigation palette.
              </p>
            </div>
            <button
              onClick={() =>
                navigate('mock-exam', {
                  subjectId: selectedSubjectId,
                  testCategory: 'Board Pattern Mock Exam',
                })
              }
              className="w-full py-2 text-xs font-semibold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Launch Mock Exam
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled / Admin Custom Test Templates */}
      {matchingCustomTests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Featured Assessments ({selectedSubject?.subjectName})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matchingCustomTests.map((ct) => (
              <div
                key={ct.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <p className="text-xs font-mono text-indigo-700 dark:text-indigo-400">
                    {ct.testCategory} · {ct.durationMinutes} mins
                  </p>
                  <h3 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                    {ct.title}
                  </h3>
                  {ct.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ct.description}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    navigate(ct.testCategory === 'Board Pattern Mock Exam' ? 'mock-exam' : 'mcq-test', {
                      subjectId: ct.subjectId === 'all' ? selectedSubjectId : ct.subjectId,
                      chapterId: ct.chapterId,
                      testCategory: ct.testCategory,
                      customTestId: ct.id,
                      initialTestMode: ct.testCategory === 'Board Pattern Mock Exam' ? 'exam' : 'learning',
                    })
                  }
                  className="w-full py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer"
                >
                  Take with {selectedSubject?.subjectName}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Test Results History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Previous Test Results ({filteredHistory.length})
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={historyFilterSubject}
              onChange={(e) => setHistoryFilterSubject(e.target.value)}
              className="px-3 py-1.5 text-sm leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="all">All Subjects</option>
              {enrolledSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigate('pyq-bank')}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Verified PYQ Bank
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No tests submitted for this filter yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Score</th>
                  <th className="pb-2 font-medium text-right">Accuracy</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map((res) => {
                  const sObj = subjects.find((s) => s.id === res.subjectId);
                  return (
                    <tr key={res.id}>
                      <td className="py-3 font-medium text-slate-900 dark:text-white">{res.title}</td>
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                        {sObj?.subjectName || res.subjectId}
                      </td>
                      <td className="py-3 text-xs text-slate-500">{res.testType}</td>
                      <td className="py-3 text-xs text-slate-500 tabular-nums">
                        {new Date(res.completedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {res.score}/{res.totalMarks}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {Math.round(res.accuracy)}%
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate('test-results', { resultId: res.id })}
                          className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const McqTestPage: React.FC = () => {
  const {
    navParams,
    questions,
    subjects,
    chapters,
    boards,
    classes,
    revisionRecords,
    studentProfile,
    getApiHeaders,
    saveTestResult,
    updateRevisionRecord,
    addStudyMinutes,
    navigate,
    showToast,
  } = useApp();

  const activeSubjectId = useMemo(() => {
    if (navParams.subjectId && subjects.some((s) => s.id === navParams.subjectId)) {
      return navParams.subjectId;
    }
    if (studentProfile?.selectedSubjectIds?.length) {
      return studentProfile.selectedSubjectIds[0];
    }
    return subjects[0]?.id || '';
  }, [navParams.subjectId, subjects, studentProfile]);

  const subject = subjects.find((s) => s.id === activeSubjectId);
  const chapter = chapters.find((c) => c.id === navParams.chapterId);
  const board = boards.find((b) => b.id === (studentProfile?.boardId || subject?.boardId));
  const cls = classes.find((c) => c.id === (studentProfile?.classId || subject?.classId));
  const testCategory: TestCategory = navParams.testCategory || 'Chapter Test';

  const [mode, setMode] = useState<'learning' | 'exam'>(navParams.initialTestMode || 'learning');
  const [idx, setIdx] = useState(0);
  const [submittedCurrent, setSubmittedCurrent] = useState(false);
  const draftKey = `ais_test_${activeSubjectId}_${navParams.chapterId || 'all'}_${testCategory}`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Strict Subject-Locked Question Pool (NEVER leaks Mathematics or another subject!)
  const baseSubjectPool = useMemo(() => {
    const strictSubject = questions.filter((q) => q.published && q.subjectId === activeSubjectId);
    let narrow = strictSubject;
    if (navParams.chapterId) {
      const chFiltered = strictSubject.filter((q) => q.chapterId === navParams.chapterId);
      if (chFiltered.length > 0) narrow = chFiltered;
    }
    if (navParams.topicName) {
      const topFiltered = narrow.filter(
        (q) => q.topicName.toLowerCase() === navParams.topicName!.toLowerCase()
      );
      if (topFiltered.length > 0) narrow = topFiltered;
    }
    if (testCategory === 'Previous Year Question Test') {
      const pyqs = narrow.filter((q) => q.isPyq && q.verificationStatus === 'Verified Official');
      if (pyqs.length > 0) narrow = pyqs;
    } else if (testCategory === 'Revision Test') {
      const weakIds = new Set(
        revisionRecords
          .filter((r) => r.subjectId === activeSubjectId)
          .flatMap((r) => r.incorrectQuestionIds || [])
      );
      if (weakIds.size > 0) {
        const prioritized = narrow.filter((q) => weakIds.has(q.id));
        if (prioritized.length >= 2) narrow = prioritized;
      }
    }

    // Filter to interactive & objective + short subjective items suitable for step test engine
    const seen = new Set<string>();
    const combined: Question[] = [];
    for (const q of [...narrow, ...strictSubject]) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        combined.push(q);
      }
      if (narrow.length >= 4 && combined.length >= narrow.length) break;
    }
    return combined;
  }, [questions, activeSubjectId, navParams.chapterId, navParams.topicName, testCategory, revisionRecords]);

  // Auto-generate syllabus-based AI practice questions ONLY when strict subject/chapter pool is small
  useEffect(() => {
    setAiGeneratedQuestions([]);
    setIdx(0);
    setSubmittedCurrent(false);
  }, [activeSubjectId, navParams.chapterId, navParams.topicName, testCategory]);

  useEffect(() => {
    let cancelled = false;
    const needsFreshTopicSet =
      Boolean(navParams.topicName && !baseSubjectPool.some((q) => q.topicName === navParams.topicName)) ||
      (testCategory === 'Previous Year Question Test' &&
        !baseSubjectPool.some((q) => q.isPyq && q.verificationStatus === 'Verified Official')) ||
      baseSubjectPool.length < 4;

    if (!subject || !needsFreshTopicSet) return;

    const loadGenerated = async () => {
      setGeneratingQuestions(true);
      try {
        const headers = await getApiHeaders();
        if (!headers['Authorization']) return;
        const res = await fetch('/api/ai/generate-test-set', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            boardId: board?.id || subject.boardId,
            boardName: board?.name || 'Selected Board',
            classId: cls?.id || subject.classId,
            className: cls?.className || 'Class 10',
            subjectId: subject.id,
            subjectName: subject.subjectName,
            chapterId: chapter?.id,
            chapterName: chapter?.chapterName,
            topicName: navParams.topicName,
            testCategory,
            medium: studentProfile?.medium || 'English',
            count: 5,
            includeWritten: testCategory === 'Weekly Test' || testCategory === 'Full Subject Test',
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.questions)) {
          setAiGeneratedQuestions(data.questions);
        }
      } catch {
        // Keep baseSubjectPool gracefully
      } finally {
        if (!cancelled) setGeneratingQuestions(false);
      }
    };

    loadGenerated();
    return () => {
      cancelled = true;
    };
  }, [
    subject,
    board,
    cls,
    chapter,
    navParams.topicName,
    testCategory,
    baseSubjectPool,
    studentProfile?.medium,
    getApiHeaders,
  ]);

  const testQuestions = useMemo(() => {
    const merged = [...aiGeneratedQuestions, ...baseSubjectPool];
    const seen = new Set<string>();
    const out: Question[] = [];
    for (const q of merged) {
      if (q.subjectId !== activeSubjectId) continue;
      if (!seen.has(q.id)) {
        seen.add(q.id);
        out.push(q);
      }
    }
    return out.slice(0, 8);
  }, [aiGeneratedQuestions, baseSubjectPool, activeSubjectId]);

  useEffect(() => {
    const t = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // Ignore quota
    }
  }, [answers, draftKey]);

  const currentQ = testQuestions[idx];
  const currentChapter = chapters.find((c) => c.id === currentQ?.chapterId) || chapter;

  if (generatingQuestions && testQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-700 mx-auto" />
        <p className="font-display text-base font-bold text-slate-900 dark:text-white">
          Preparing {subject?.subjectName} {testCategory}...
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generating syllabus-aligned practice questions strictly for {subject?.subjectName}.
        </p>
      </div>
    );
  }

  if (!currentQ || !subject) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No questions are currently available for {subject?.subjectName || 'this subject'}.
        </p>
        <button
          onClick={() => navigate('tests')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  const currentAnswerRaw = answers[currentQ.id] || '';
  const isWrittenType = WRITTEN_TYPES.has(currentQ.questionType);

  const handleSubmitCurrent = () => {
    const hasAnswer =
      currentQ.questionType === 'Multiple Correct'
        ? parseMultiAnswers(currentAnswerRaw).length > 0
        : currentQ.questionType === 'Match the Following'
        ? Object.keys(parseMatchAnswers(currentAnswerRaw)).length > 0
        : Boolean(currentAnswerRaw.trim());

    if (!hasAnswer) {
      showToast('Enter or select an answer first.', 'info');
      return;
    }
    if (mode === 'learning') {
      setSubmittedCurrent(true);
    } else if (idx < testQuestions.length - 1) {
      setIdx(idx + 1);
      setSubmittedCurrent(false);
    }
  };

  const handleFinishTest = async () => {
    if (!studentProfile) return;
    setSubmitting(true);
    try {
      const headers = await getApiHeaders();
      let score = 0;
      let totalMarks = 0;
      let correctCount = 0;
      const weakTopicSet = new Set<string>();
      const incorrectIds: string[] = [];
      const evaluated: EvaluatedAnswerItem[] = [];

      for (const q of testQuestions) {
        totalMarks += q.marks;
        const rawAns = answers[q.id] || '';
        const aiGenFlag = isAiPracticeItem(q);

        if (WRITTEN_TYPES.has(q.questionType)) {
          const trimmed = rawAns.trim();
          if (!trimmed) {
            weakTopicSet.add(q.topicName);
            incorrectIds.push(q.id);
            evaluated.push({
              questionId: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              studentAnswer: 'Not answered',
              correctOrModelAnswer: q.modelAnswer || q.explanation,
              isCorrect: false,
              awardedMarks: 0,
              maxMarks: q.marks,
              feedback: 'No answer submitted for this subjective question.',
              mistakes: ['Answer left blank'],
              missingKeyPoints: q.rubricPoints || [],
              topicName: q.topicName,
              aiGenerated: aiGenFlag,
            });
            continue;
          }

          let awarded = 0;
          let feedback = q.explanation;
          let mistakes: string[] = [];
          let missingKeyPoints: string[] = [];

          if (headers['Authorization']) {
            try {
              const res = await fetch('/api/ai/evaluate-written', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  boardName: board?.name || 'Board',
                  className: cls?.className || 'Class 10',
                  subjectName: subject.subjectName,
                  medium: studentProfile.medium,
                  questionText: q.questionText,
                  maxMarks: q.marks,
                  modelAnswer: q.modelAnswer || q.explanation,
                  rubricPoints: q.rubricPoints || [],
                  studentAnswer: trimmed,
                }),
              });
              if (res.ok) {
                const ev = await res.json();
                awarded = Number(ev.estimatedMarks) || 0;
                feedback = ev.constructiveFeedback || q.explanation;
                mistakes = Array.isArray(ev.mistakes) ? ev.mistakes : [];
                missingKeyPoints = Array.isArray(ev.missingKeyPoints) ? ev.missingKeyPoints : [];
              }
            } catch {
              // Fallback rubric check below
            }
          }
          if (awarded === 0 && mistakes.length === 0 && missingKeyPoints.length === 0) {
            const rubricTerms = (q.modelAnswer || q.explanation)
              .toLowerCase()
              .split(/\W+/)
              .filter((w) => w.length > 4);
            const ansLower = trimmed.toLowerCase();
            const hits = rubricTerms.filter((w) => ansLower.includes(w)).length;
            const ratio = rubricTerms.length > 0 ? Math.min(0.8, hits / Math.min(8, rubricTerms.length)) : 0;
            awarded = Math.round(ratio * q.marks * 2) / 2;
            if (awarded < q.marks) {
              missingKeyPoints = ['Include more syllabus definitions and step-by-step points.'];
            }
          }
          score += awarded;
          const isOk = awarded >= q.marks * 0.7;
          if (isOk) correctCount += 1;
          else {
            weakTopicSet.add(q.topicName);
            incorrectIds.push(q.id);
          }
          evaluated.push({
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            studentAnswer: trimmed,
            correctOrModelAnswer: q.modelAnswer || q.explanation,
            isCorrect: isOk,
            awardedMarks: awarded,
            maxMarks: q.marks,
            feedback,
            mistakes,
            missingKeyPoints,
            topicName: q.topicName,
            aiGenerated: aiGenFlag,
          });
        } else {
          const graded = gradeObjectiveQuestion(q, rawAns);
          score += graded.awardedMarks;
          if (graded.isCorrect) {
            correctCount += 1;
          } else {
            weakTopicSet.add(q.topicName);
            incorrectIds.push(q.id);
          }
          evaluated.push({
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            studentAnswer: graded.studentDisplay,
            correctOrModelAnswer: graded.correctDisplay,
            isCorrect: graded.isCorrect,
            awardedMarks: graded.awardedMarks,
            maxMarks: q.marks,
            feedback: q.explanation,
            mistakes: graded.isCorrect ? [] : ['Selected or entered answer did not match answer key.'],
            topicName: q.topicName,
            aiGenerated: aiGenFlag,
          });
        }
      }

      const accuracy = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const spentMins = Math.max(1, Math.round(secondsElapsed / 60));
      const resultId = `res_${Date.now()}`;
      const result: TestResult = {
        id: resultId,
        testId: `test_${Date.now()}`,
        studentId: studentProfile.userId,
        subjectId: subject.id,
        chapterId: chapter?.id,
        testType: testCategory,
        title: chapter
          ? `${subject.subjectName}: ${chapter.chapterName} (${testCategory})`
          : `${subject.subjectName} — ${testCategory}`,
        score: Math.round(score * 10) / 10,
        totalMarks,
        accuracy,
        answers: evaluated,
        weakTopics: Array.from(weakTopicSet),
        timeSpentMinutes: spentMins,
        completedAt: new Date().toISOString(),
      };

      await saveTestResult(result);
      await addStudyMinutes(spentMins);

      if (currentChapter && incorrectIds.length > 0) {
        const nextRev = new Date();
        nextRev.setDate(nextRev.getDate() + 1);
        await updateRevisionRecord({
          id: `rev_${studentProfile.userId}_${currentChapter.id}`,
          studentId: studentProfile.userId,
          chapterId: currentChapter.id,
          subjectId: subject.id,
          chapterName: currentChapter.chapterName,
          stage: 1,
          nextReviewDate: nextRev.toISOString().slice(0, 10),
          lastPerformance: `${Math.round(accuracy)}% in ${testCategory}`,
          incorrectQuestionIds: incorrectIds,
          updatedAt: new Date().toISOString(),
        });
      }

      window.localStorage.removeItem(draftKey);
      navigate('test-results', { resultId });
    } catch (err: any) {
      showToast(err.message || 'Could not save test results.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
  const secs = String(secondsElapsed % 60).padStart(2, '0');
  const currentGradePreview = !isWrittenType ? gradeObjectiveQuestion(currentQ, currentAnswerRaw) : null;
  const shuffledRights =
    currentQ.questionType === 'Match the Following' && currentQ.matchPairs
      ? shuffleDeterministic(
          currentQ.matchPairs.map((p) => p.right),
          currentQ.id
        )
      : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('tests')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit {subject.subjectName} Test</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => {
                setMode('learning');
                setSubmittedCurrent(false);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                mode === 'learning' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Practice Mode
            </button>
            <button
              onClick={() => {
                setMode('exam');
                setSubmittedCurrent(false);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                mode === 'exam' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Exam Mode
            </button>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* Subject & Source Transparency Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-900 dark:text-white">
          {subject.subjectName} · {testCategory}
          {chapter ? ` · Ch ${chapter.chapterNumber}: ${chapter.chapterName}` : ''}
        </span>
        {generatingQuestions ? (
          <span className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Adding syllabus practice questions...
          </span>
        ) : isAiPracticeItem(currentQ) ? (
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            AI-Generated Practice Question (Not a Verified PYQ)
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">{currentQ.sourceType}</span>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-mono font-semibold tabular-nums">
            Question {idx + 1} of {testQuestions.length} · {currentQ.questionType} · {currentQ.topicName} · {currentQ.marks} Mark(s)
          </span>
          <PriorityText priority={currentQ.priority} />
        </div>

        <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
          {currentQ.questionText}
        </h1>

        {currentQ.diagramSvg && (
          <div
            className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: currentQ.diagramSvg }}
          />
        )}

        {/* Question Type Specific Interactive Inputs */}
        {currentQ.questionType === 'Multiple Correct' && (currentQ.options || []).length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500">Select all options that apply:</p>
            {(currentQ.options || []).map((opt, oi) => {
              const pickedList = parseMultiAnswers(currentAnswerRaw);
              const isPicked = pickedList.includes(opt);
              const showOutcome = mode === 'learning' && submittedCurrent;
              const isExpected = (currentQ.correctAnswers || []).includes(opt);
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={showOutcome}
                  onClick={() => {
                    const next = isPicked
                      ? pickedList.filter((item) => item !== opt)
                      : [...pickedList, opt];
                    setAnswers((p) => ({ ...p, [currentQ.id]: JSON.stringify(next) }));
                  }}
                  className={`w-full p-3.5 rounded-lg border text-left text-sm font-medium flex items-center gap-3 cursor-pointer ${
                    showOutcome && isExpected
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                      : showOutcome && isPicked && !isExpected
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40'
                      : isPicked
                      ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isPicked}
                    readOnly
                    className="rounded border-slate-300 accent-indigo-700"
                  />
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        ) : currentQ.questionType === 'Match the Following' && currentQ.matchPairs ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Match each item on the left to its correct pair on the right:</p>
            {currentQ.matchPairs.map((pair, pi) => {
              const map = parseMatchAnswers(currentAnswerRaw);
              const pickedVal = map[pair.left] || '';
              const showOutcome = mode === 'learning' && submittedCurrent;
              return (
                <div
                  key={pi}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {pi + 1}. {pair.left}
                  </span>
                  <select
                    disabled={showOutcome}
                    value={pickedVal}
                    onChange={(e) => {
                      const nextMap = { ...map, [pair.left]: e.target.value };
                      setAnswers((p) => ({ ...p, [currentQ.id]: JSON.stringify(nextMap) }));
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">Select match...</option>
                    {shuffledRights.map((rOpt, ri) => (
                      <option key={ri} value={rOpt}>
                        {rOpt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ) : currentQ.questionType === 'Fill in the Blanks' ||
          (currentQ.questionType === 'Numerical' && !(currentQ.options && currentQ.options.length > 0)) ? (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Enter Exact Answer:
            </label>
            <input
              type="text"
              disabled={mode === 'learning' && submittedCurrent}
              value={currentAnswerRaw}
              onChange={(e) => setAnswers((p) => ({ ...p, [currentQ.id]: e.target.value }))}
              placeholder="Type your exact answer..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        ) : isWrittenType ? (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Write Your Board-Style Answer:
            </label>
            <textarea
              rows={5}
              disabled={mode === 'learning' && submittedCurrent}
              value={currentAnswerRaw}
              onChange={(e) => setAnswers((p) => ({ ...p, [currentQ.id]: e.target.value }))}
              placeholder="Write your clear, step-wise answer here..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {(currentQ.options || []).map((opt, oi) => {
              const picked = currentAnswerRaw === opt;
              const showOutcome = mode === 'learning' && submittedCurrent;
              const isAnswer = opt === currentQ.correctAnswer;

              let optionClasses =
                'border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-800 dark:text-slate-200';
              if (showOutcome) {
                if (isAnswer) {
                  optionClasses =
                    'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                } else if (picked && !isAnswer) {
                  optionClasses =
                    'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                }
              } else if (picked) {
                optionClasses =
                  'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100';
              }

              return (
                <button
                  key={oi}
                  type="button"
                  disabled={showOutcome}
                  onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))}
                  className={`w-full p-3.5 rounded-lg border text-left text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer ${optionClasses}`}
                >
                  <span className="font-mono text-xs font-bold w-6 h-6 rounded border border-current/25 flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Practice mode immediate explanation */}
        {mode === 'learning' && submittedCurrent && (
          <div
            className={`p-4 rounded-lg border text-sm space-y-1 ${
              isWrittenType
                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200'
                : currentGradePreview?.isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {isWrittenType ? (
                <>
                  <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <span>Model Reference (Full AI Rubric Evaluation Runs on Final Submit)</span>
                </>
              ) : currentGradePreview?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Correct Answer ({currentGradePreview.awardedMarks}/{currentQ.marks} Marks)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Answer Key: {currentGradePreview?.correctDisplay}</span>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm leading-relaxed pt-1 whitespace-pre-line">
              {isWrittenType ? currentQ.modelAnswer || currentQ.explanation : currentQ.explanation}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => {
              setIdx(idx - 1);
              setSubmittedCurrent(false);
            }}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Previous Question
          </button>

          <div className="flex items-center gap-2">
            {mode === 'learning' && !submittedCurrent && (
              <button
                type="button"
                onClick={handleSubmitCurrent}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                Check Answer
              </button>
            )}

            {idx < testQuestions.length - 1 && (
              <button
                type="button"
                onClick={() => {
                  setIdx(idx + 1);
                  setSubmittedCurrent(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {(idx === testQuestions.length - 1 || mode === 'exam') && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinishTest}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Evaluating & Saving...' : 'Finish & View Result'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const WrittenTestPage: React.FC = () => {
  const {
    navParams,
    questions,
    subjects,
    chapters,
    boards,
    classes,
    studentProfile,
    getApiHeaders,
    saveTestResult,
    addStudyMinutes,
    navigate,
    showToast,
  } = useApp();

  const activeSubjectId = useMemo(() => {
    if (navParams.subjectId && subjects.some((s) => s.id === navParams.subjectId)) {
      return navParams.subjectId;
    }
    if (studentProfile?.selectedSubjectIds?.length) {
      return studentProfile.selectedSubjectIds[0];
    }
    return subjects[0]?.id || '';
  }, [navParams.subjectId, subjects, studentProfile]);

  const [extraQuestions, setExtraQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);

  // Strict subject-locked written pool (NEVER falls back to Mathematics!)
  const writtenQuestions = useMemo(() => {
    const subjWritten = [...extraQuestions, ...questions].filter((q) => {
      if (!q.published || q.subjectId !== activeSubjectId) return false;
      return WRITTEN_TYPES.has(q.questionType) || (q.questionType === 'Numerical' && !(q.options && q.options.length > 0));
    });
    if (navParams.chapterId) {
      const chFiltered = subjWritten.filter((q) => q.chapterId === navParams.chapterId);
      if (chFiltered.length > 0) return chFiltered;
    }
    return subjWritten;
  }, [extraQuestions, questions, activeSubjectId, navParams.chapterId]);

  const [selectedQId, setSelectedQId] = useState(writtenQuestions[0]?.id || '');
  useEffect(() => {
    if (writtenQuestions.length > 0 && !writtenQuestions.some((q) => q.id === selectedQId)) {
      setSelectedQId(writtenQuestions[0].id);
    }
  }, [writtenQuestions, selectedQId]);

  const activeQ = writtenQuestions.find((q) => q.id === selectedQId) || writtenQuestions[0];
  const subject = subjects.find((s) => s.id === activeSubjectId);
  const chapter = chapters.find((c) => c.id === (activeQ?.chapterId || navParams.chapterId)) || chapters.find((c) => c.subjectId === activeSubjectId);
  const board = boards.find((b) => b.id === (studentProfile?.boardId || subject?.boardId));
  const cls = classes.find((c) => c.id === (studentProfile?.classId || subject?.classId));

  const [studentAnswer, setStudentAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    estimatedMarks: number;
    maxMarks: number;
    strengths: string[];
    mistakes: string[];
    missingKeyPoints: string[];
    structureAdvice: string;
    expectedModelSummary: string;
    constructiveFeedback: string;
    disclaimer: string;
  } | null>(null);
  const [showModel, setShowModel] = useState(false);

  const handleGenerateWritten = async () => {
    if (!subject || generating) return;
    setGenerating(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/ai/generate-practice', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          boardName: board?.name || 'Selected Board',
          className: cls?.className || 'Class 10',
          subjectName: subject.subjectName,
          chapterName: chapter?.chapterName || 'Core Syllabus Chapter',
          medium: studentProfile?.medium || 'English',
          questionType: 'Short Answer',
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate written questions.');
      const mapped: Question[] = (data.questions || []).map((gq: any, i: number) => ({
        id: `gen_wr_${Date.now()}_${i}`,
        boardId: board?.id || subject.boardId,
        classId: cls?.id || subject.classId,
        subjectId: subject.id,
        chapterId: chapter?.id || '',
        topicName: gq.topicName || chapter?.chapterName || subject.subjectName,
        questionText: gq.questionText,
        questionType: 'Short Answer',
        modelAnswer: gq.explanationOrModelAnswer,
        explanation: gq.explanationOrModelAnswer,
        rubricPoints: gq.rubricPoints || [],
        marks: gq.marks || 3,
        priority: 'YELLOW',
        isPyq: false,
        aiGenerated: true,
        sourceType: 'Predicted Practice',
        verificationStatus: 'Under Review',
        published: true,
      }));
      setExtraQuestions((prev) => [...mapped, ...prev]);
      if (mapped[0]) setSelectedQId(mapped[0].id);
      showToast(`Generated ${mapped.length} syllabus written questions for ${subject.subjectName}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Unable to generate questions right now.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!activeQ) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No written questions found for {subject?.subjectName || 'this subject'} filter yet.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleGenerateWritten}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating...' : `Generate ${subject?.subjectName} Written Questions`}</span>
          </button>
          <button
            onClick={() => navigate('tests')}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentAnswer.trim().length < 8) {
      showToast('Write a more complete answer before submitting.', 'info');
      return;
    }
    setEvaluating(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/ai/evaluate-written', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          boardName: board?.name || 'Selected Board',
          className: cls?.className || 'Class 10',
          subjectName: subject?.subjectName || 'Subject',
          medium: studentProfile?.medium || 'English',
          questionText: activeQ.questionText,
          maxMarks: activeQ.marks,
          modelAnswer: activeQ.modelAnswer || activeQ.explanation,
          rubricPoints: activeQ.rubricPoints || [],
          studentAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setEvaluation({
        estimatedMarks: Number(data.estimatedMarks) || 0,
        maxMarks: Number(data.maxMarks) || activeQ.marks,
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        mistakes: Array.isArray(data.mistakes) ? data.mistakes : [],
        missingKeyPoints: Array.isArray(data.missingKeyPoints) ? data.missingKeyPoints : [],
        structureAdvice: data.structureAdvice || '',
        expectedModelSummary: data.expectedModelSummary || '',
        constructiveFeedback: data.constructiveFeedback || '',
        disclaimer: data.disclaimer || 'Rubric-based AI estimate for practice only.',
      });
      setShowModel(true);

      if (studentProfile) {
        await saveTestResult({
          id: `wres_${Date.now()}`,
          testId: `wtest_${Date.now()}`,
          studentId: studentProfile.userId,
          subjectId: activeQ.subjectId,
          chapterId: activeQ.chapterId,
          testType: 'Written Test',
          title: `Written (${subject?.subjectName}): ${activeQ.questionText.slice(0, 44)}...`,
          score: Number(data.estimatedMarks) || 0,
          totalMarks: Number(data.maxMarks) || activeQ.marks,
          accuracy: ((Number(data.estimatedMarks) || 0) / (Number(data.maxMarks) || activeQ.marks)) * 100,
          answers: [
            {
              questionId: activeQ.id,
              questionText: activeQ.questionText,
              questionType: activeQ.questionType,
              studentAnswer,
              correctOrModelAnswer: activeQ.modelAnswer || activeQ.explanation,
              awardedMarks: Number(data.estimatedMarks) || 0,
              maxMarks: Number(data.maxMarks) || activeQ.marks,
              feedback: data.constructiveFeedback,
              mistakes: Array.isArray(data.mistakes) ? data.mistakes : [],
              missingKeyPoints: Array.isArray(data.missingKeyPoints) ? data.missingKeyPoints : [],
              topicName: activeQ.topicName,
              aiGenerated: isAiPracticeItem(activeQ),
            },
          ],
          weakTopics:
            (Number(data.estimatedMarks) || 0) < (Number(data.maxMarks) || activeQ.marks) * 0.7
              ? [activeQ.topicName]
              : [],
          timeSpentMinutes: 5,
          completedAt: new Date().toISOString(),
        });
        await addStudyMinutes(5);
      }
      showToast('AI feedback ready and saved to your progress.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('tests')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tests</span>
        </button>

        <button
          onClick={handleGenerateWritten}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{generating ? 'Generating...' : 'Generate New Written Question'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Written Answer Practice ({subject?.subjectName})
          </h1>
          <select
            value={activeQ.id}
            onChange={(e) => {
              setSelectedQId(e.target.value);
              setStudentAnswer('');
              setEvaluation(null);
              setShowModel(false);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 max-w-xs"
          >
            {writtenQuestions.map((q, i) => (
              <option key={q.id} value={q.id}>
                Q{i + 1} ({q.marks} Marks · {q.questionType}): {q.questionText.slice(0, 42)}...
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-500">
              {chapter?.chapterName} · {activeQ.questionType} · {activeQ.marks} Marks
              {isAiPracticeItem(activeQ) ? ' · AI-Generated Practice Question' : ''}
            </span>
            <PriorityText priority={activeQ.priority} />
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{activeQ.questionText}</p>
        </div>

        <form onSubmit={handleEvaluate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Write Your Answer (include definitions, steps, formulas, or headings)
            </label>
            <textarea
              rows={7}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type your full board-style answer here..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{evaluating ? 'Checking Answer Against Rubric...' : 'Submit for AI Answer Checking'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModel(!showModel)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              {showModel ? 'Hide Model Answer' : 'View Model Answer & Rubric'}
            </button>
          </div>
        </form>
      </div>

      {evaluation && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Strict Rubric Evaluation Report
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{evaluation.disclaimer}</p>
            </div>
            <div className="font-display text-2xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
              {evaluation.estimatedMarks} / {evaluation.maxMarks} Marks
            </div>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200">{evaluation.constructiveFeedback}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1.5">
              <p className="font-bold text-emerald-800 dark:text-emerald-300">Correct Points Covered</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                {evaluation.strengths.length === 0 ? (
                  <li>No accurate syllabus points detected.</li>
                ) : (
                  evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)
                )}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 space-y-1.5">
              <p className="font-bold text-rose-800 dark:text-rose-300">Mistakes &amp; Inaccuracies</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                {evaluation.mistakes.length === 0 ? (
                  <li>No major factual errors spotted.</li>
                ) : (
                  evaluation.mistakes.map((m, i) => <li key={i}>{m}</li>)
                )}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1.5">
              <p className="font-bold text-amber-800 dark:text-amber-300">Missing Rubric Points</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                {evaluation.missingKeyPoints.length === 0 ? (
                  <li>All major rubric points covered.</li>
                ) : (
                  evaluation.missingKeyPoints.map((m, i) => <li key={i}>{m}</li>)
                )}
              </ul>
            </div>
          </div>

          {evaluation.expectedModelSummary && (
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-200">
              <span className="font-bold block mb-1">Ideal Answer Key Points:</span>
              {evaluation.expectedModelSummary}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">How to Improve Structure:</span>{' '}
            {evaluation.structureAdvice}
          </p>
        </div>
      )}

      {showModel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Model Answer &amp; Board Rubric
          </h3>
          <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
            {activeQ.modelAnswer || activeQ.explanation}
          </pre>
          {activeQ.rubricPoints && activeQ.rubricPoints.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Step-Wise Marking Scheme:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                {activeQ.rubricPoints.map((rp, idx) => (
                  <li key={idx}>{rp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MockExamPage: React.FC = () => {
  const {
    navParams,
    subjects,
    boards,
    classes,
    questions,
    studentProfile,
    getApiHeaders,
    saveTestResult,
    addStudyMinutes,
    navigate,
    showToast,
  } = useApp();

  const subject = useMemo(() => {
    if (navParams.subjectId) {
      const exact = subjects.find((s) => s.id === navParams.subjectId);
      if (exact) return exact;
    }
    if (studentProfile?.selectedSubjectIds?.length) {
      const enrolled = subjects.find((s) => s.id === studentProfile.selectedSubjectIds[0]);
      if (enrolled) return enrolled;
    }
    return subjects[0];
  }, [navParams.subjectId, subjects, studentProfile]);

  const board = boards.find((b) => b.id === (studentProfile?.boardId || subject?.boardId));
  const cls = classes.find((c) => c.id === (studentProfile?.classId || subject?.classId));

  const [aiAddedQuestions, setAiAddedQuestions] = useState<Question[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Strict Subject Lock — NEVER fall back to board or other subjects!
  const examQuestions = useMemo(() => {
    if (!subject) return [];
    const subjPool = [...questions, ...aiAddedQuestions].filter(
      (q) => q.subjectId === subject.id && q.published
    );
    const seen = new Set<string>();
    return subjPool.filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
  }, [questions, aiAddedQuestions, subject]);

  useEffect(() => {
    setAiAddedQuestions([]);
  }, [subject?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!subject) return;
    const baseCount = questions.filter((q) => q.subjectId === subject.id && q.published).length;
    if (baseCount >= 5) return;

    const fillSubjectMock = async () => {
      setLoadingAi(true);
      try {
        const headers = await getApiHeaders();
        if (!headers['Authorization']) return;
        const res = await fetch('/api/ai/generate-test-set', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            boardId: board?.id || subject.boardId,
            boardName: board?.name || 'Selected Board',
            classId: cls?.id || subject.classId,
            className: cls?.className || 'Class 10',
            subjectId: subject.id,
            subjectName: subject.subjectName,
            testCategory: 'Board Pattern Mock Exam',
            medium: studentProfile?.medium || 'English',
            count: 5,
            includeWritten: true,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.questions)) {
          setAiAddedQuestions(data.questions);
        }
      } catch {
        // Keep base questions
      } finally {
        if (!cancelled) setLoadingAi(false);
      }
    };
    fillSubjectMock();
    return () => {
      cancelled = true;
    };
  }, [subject, questions, board, cls, studentProfile?.medium, getApiHeaders]);

  const draftKey = `ais_mock_${subject?.id || 'default'}`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const totalSecondsConfigured = (subject?.examDurationMinutes || 60) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSecondsConfigured);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSecondsLeft((subject?.examDurationMinutes || 60) * 60);
    setCurrentIdx(0);
  }, [subject?.id, subject?.examDurationMinutes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // Ignore storage error
    }
  }, [answers, draftKey]);

  const q = examQuestions[currentIdx];

  if (loadingAi && examQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-700 mx-auto" />
        <p className="font-display text-base font-bold text-slate-900 dark:text-white">
          Building {subject?.subjectName} Mock Exam...
        </p>
      </div>
    );
  }

  if (!q || !subject) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Mock exam pool empty for {subject?.subjectName}.</p>
        <button
          onClick={() => navigate('tests')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  const handleFinalSubmit = async () => {
    if (!studentProfile) return;
    setSubmitting(true);
    try {
      const headers = await getApiHeaders();
      let totalScore = 0;
      let totalMarks = 0;
      const weakTopics = new Set<string>();
      const evaluated: EvaluatedAnswerItem[] = [];

      for (const item of examQuestions) {
        const rawAns = answers[item.id] || '';
        totalMarks += item.marks;
        const aiGenFlag = isAiPracticeItem(item);

        if (WRITTEN_TYPES.has(item.questionType)) {
          const trimmed = rawAns.trim();
          let awarded = 0;
          let feedback = item.explanation;
          let mistakes: string[] = [];
          let missingKeyPoints: string[] = [];

          if (!trimmed) {
            mistakes = ['Left unanswered'];
          } else if (headers['Authorization']) {
            try {
              const res = await fetch('/api/ai/evaluate-written', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  boardName: board?.name || 'Selected Board',
                  className: cls?.className || 'Class 10',
                  subjectName: subject.subjectName,
                  medium: studentProfile.medium,
                  questionText: item.questionText,
                  maxMarks: item.marks,
                  modelAnswer: item.modelAnswer || item.explanation,
                  rubricPoints: item.rubricPoints || [],
                  studentAnswer: trimmed,
                }),
              });
              if (res.ok) {
                const ev = await res.json();
                awarded = Number(ev.estimatedMarks) || 0;
                feedback = ev.constructiveFeedback || item.explanation;
                mistakes = Array.isArray(ev.mistakes) ? ev.mistakes : [];
                missingKeyPoints = Array.isArray(ev.missingKeyPoints) ? ev.missingKeyPoints : [];
              }
            } catch {
              // Fallback strict keyword match below
            }
          }

          if (trimmed && awarded === 0 && mistakes.length === 0) {
            const modelTokens = (item.modelAnswer || item.explanation)
              .toLowerCase()
              .split(/\W+/)
              .filter((w) => w.length > 4);
            const ansLower = trimmed.toLowerCase();
            const hits = modelTokens.filter((w) => ansLower.includes(w)).length;
            const ratio = modelTokens.length > 0 ? Math.min(0.8, hits / Math.min(8, modelTokens.length)) : 0;
            awarded = Math.round(ratio * item.marks * 2) / 2;
          }

          totalScore += awarded;
          if (awarded < item.marks * 0.6) weakTopics.add(item.topicName);

          evaluated.push({
            questionId: item.id,
            questionText: item.questionText,
            questionType: item.questionType,
            studentAnswer: trimmed || 'Not answered',
            correctOrModelAnswer: item.modelAnswer || item.explanation,
            isCorrect: awarded >= item.marks * 0.7,
            awardedMarks: awarded,
            maxMarks: item.marks,
            feedback,
            mistakes,
            missingKeyPoints,
            topicName: item.topicName,
            aiGenerated: aiGenFlag,
          });
        } else {
          const graded = gradeObjectiveQuestion(item, rawAns);
          totalScore += graded.awardedMarks;
          if (!graded.isCorrect) weakTopics.add(item.topicName);

          evaluated.push({
            questionId: item.id,
            questionText: item.questionText,
            questionType: item.questionType,
            studentAnswer: graded.studentDisplay,
            correctOrModelAnswer: graded.correctDisplay,
            isCorrect: graded.isCorrect,
            awardedMarks: graded.awardedMarks,
            maxMarks: item.marks,
            feedback: item.explanation,
            mistakes: graded.isCorrect ? [] : ['Did not match answer key.'],
            topicName: item.topicName,
            aiGenerated: aiGenFlag,
          });
        }
      }

      const accuracy = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
      const spentMins = Math.max(1, Math.round((totalSecondsConfigured - secondsLeft) / 60));
      const resultId = `mock_${Date.now()}`;
      await saveTestResult({
        id: resultId,
        testId: `mock_session_${Date.now()}`,
        studentId: studentProfile.userId,
        subjectId: subject.id,
        testType: 'Board Pattern Mock Exam',
        title: `${board?.boardCode || ''} ${subject.subjectName} Mock Exam`,
        score: Math.round(totalScore * 10) / 10,
        totalMarks,
        accuracy,
        answers: evaluated,
        weakTopics: Array.from(weakTopics),
        timeSpentMinutes: spentMins,
        completedAt: new Date().toISOString(),
      });

      await addStudyMinutes(spentMins);
      window.localStorage.removeItem(draftKey);
      showToast('Mock Exam submitted and graded.', 'success');
      navigate('test-results', { resultId });
    } finally {
      setSubmitting(false);
    }
  };

  const hrs = Math.floor(secondsLeft / 3600);
  const mins = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const rawMockAns = answers[q.id] || '';
  const shuffledRights =
    q.questionType === 'Match the Following' && q.matchPairs
      ? shuffleDeterministic(
          q.matchPairs.map((p) => p.right),
          q.id
        )
      : [];

  return (
    <div className="space-y-6">
      {/* Exam Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {board?.name} Blueprint · Strictly Subject-Locked · Auto-saved locally
          </p>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {subject.subjectName} — Full Mock Examination
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-base font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
            {hrs}:{mins}:{secs}
          </div>
          <button
            onClick={() => setConfirmSubmit(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Canvas */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold">
              Question {currentIdx + 1} of {examQuestions.length} · {q.questionType} · {q.marks} Mark(s)
            </span>
            <span>
              {q.topicName}
              {isAiPracticeItem(q) ? ' · AI-Generated Practice' : ''}
            </span>
          </div>

          <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
            {q.questionText}
          </p>

          {q.diagramSvg && (
            <div
              className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: q.diagramSvg }}
            />
          )}

          {q.questionType === 'Multiple Correct' && (q.options || []).length > 0 ? (
            <div className="space-y-2.5">
              {(q.options || []).map((opt, oi) => {
                const pickedList = parseMultiAnswers(rawMockAns);
                const isPicked = pickedList.includes(opt);
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => {
                      const next = isPicked
                        ? pickedList.filter((item) => item !== opt)
                        : [...pickedList, opt];
                      setAnswers((p) => ({ ...p, [q.id]: JSON.stringify(next) }));
                    }}
                    className={`w-full p-3.5 rounded-lg border text-left text-sm font-medium flex items-center gap-3 cursor-pointer ${
                      isPicked
                        ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input type="checkbox" checked={isPicked} readOnly className="rounded accent-indigo-700" />
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : q.questionType === 'Match the Following' && q.matchPairs ? (
            <div className="space-y-3">
              {q.matchPairs.map((pair, pi) => {
                const map = parseMatchAnswers(rawMockAns);
                return (
                  <div
                    key={pi}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    <span className="text-sm font-medium">{pair.left}</span>
                    <select
                      value={map[pair.left] || ''}
                      onChange={(e) => {
                        const next = { ...map, [pair.left]: e.target.value };
                        setAnswers((p) => ({ ...p, [q.id]: JSON.stringify(next) }));
                      }}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="">Select match...</option>
                      {shuffledRights.map((rOpt, ri) => (
                        <option key={ri} value={rOpt}>
                          {rOpt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          ) : q.questionType === 'Fill in the Blanks' ? (
            <input
              type="text"
              value={rawMockAns}
              onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Fill in the blank..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          ) : q.options && q.options.length > 0 ? (
            <div className="space-y-2.5">
              {q.options.map((opt, oi) => {
                const picked = rawMockAns === opt;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                    className={`w-full p-3.5 rounded-lg border text-left text-sm font-medium flex items-center gap-3 cursor-pointer ${
                      picked
                        ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold">{String.fromCharCode(65 + oi)}.</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              rows={6}
              value={rawMockAns}
              onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Write your subjective answer here (auto-saved)..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={currentIdx >= examQuestions.length - 1}
              onClick={() => setCurrentIdx((i) => Math.min(examQuestions.length - 1, i + 1))}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Next Question
            </button>
          </div>
        </div>

        {/* Question Palette */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Question Navigation
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {examQuestions.map((item, idx) => {
              const answered = Boolean((answers[item.id] || '').trim());
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-lg text-xs font-mono font-semibold border cursor-pointer ${
                    isCurrent
                      ? 'border-indigo-700 bg-indigo-700 text-white'
                      : answered
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pattern Note: {board?.examPatternSummary}
          </p>
        </aside>
      </div>

      {/* Submit Confirmation Dialog */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Exam Submission</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have answered {Object.values(answers).filter((a) => a.trim()).length} of{' '}
              {examQuestions.length} questions. Once submitted, objective answers and written sections will be graded and saved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => setConfirmSubmit(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Continue Writing
              </button>
              <button
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Grading Exam...' : 'Yes, Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TestResultsPage: React.FC = () => {
  const { navParams, testResults, subjects, navigate } = useApp();
  const result = testResults.find((r) => r.id === navParams.resultId) || testResults[0];

  if (!result) {
    return (
      <div className="p-8 text-center space-y-3">
        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm text-slate-500">No test result selected.</p>
        <button
          onClick={() => navigate('tests')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
        >
          Go to Tests
        </button>
      </div>
    );
  }

  const subject = subjects.find((s) => s.id === result.subjectId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('tests')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tests</span>
        </button>
        <button
          onClick={() => navigate('revision')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          Revise Weak Topics
        </button>
      </div>

      {/* Scorecard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="md:col-span-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subject?.subjectName || 'Subject'} · {result.testType} · {new Date(result.completedAt).toLocaleString()}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {result.title}
          </h1>
          {result.weakTopics.length > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Weak topics flagged for revision: {result.weakTopics.join(', ')}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500">Score</p>
          <p className="font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {result.score} / {result.totalMarks}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Accuracy</p>
          <p className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {Math.round(result.accuracy)}%
          </p>
        </div>
      </div>

      {/* Answer Key & Review */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Detailed Answer Key &amp; Review
        </h2>
        <div className="space-y-4">
          {result.answers.map((ans, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500">
                  Q{idx + 1} · {ans.questionType} · {ans.topicName}
                  {ans.aiGenerated ? ' · AI-Generated Practice' : ''}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    ans.awardedMarks === ans.maxMarks
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {ans.awardedMarks} / {ans.maxMarks} Marks
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{ans.questionText}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Your Answer: <span className="font-medium">{ans.studentAnswer}</span>
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Reference Answer: <span className="font-medium">{ans.correctOrModelAnswer}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ans.feedback}</p>
              {ans.mistakes && ans.mistakes.length > 0 && (
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  Mistakes: {ans.mistakes.join('; ')}
                </p>
              )}
              {ans.missingKeyPoints && ans.missingKeyPoints.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Missing Key Points: {ans.missingKeyPoints.join('; ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
