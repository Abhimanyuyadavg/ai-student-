import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PriorityLevel } from '../types/index.ts';
import { CurriculumStatusText, PriorityText } from '../components/StatusText.tsx';

const ALL_QUESTION_TYPES = [
  'MCQ',
  'Multiple Correct',
  'True/False',
  'Fill in the Blanks',
  'Match the Following',
  'Very Short Answer',
  'Short Answer',
  'Long Answer',
  'Numerical',
  'Diagram-Based',
  'Case-Based',
  'Practical',
];

export const QuestionBankPage: React.FC = () => {
  const { questions, boards, classes, subjects, chapters, studentProfile } = useApp();
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState<string>(studentProfile?.boardId || 'all');
  const [classFilter, setClassFilter] = useState<string>(studentProfile?.classId || 'all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [marksFilter, setMarksFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visibleSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (boardFilter !== 'all' && s.boardId !== boardFilter) return false;
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      return true;
    });
  }, [subjects, boardFilter, classFilter]);

  const visibleChapters = useMemo(() => {
    if (subjectFilter === 'all') return [];
    return chapters.filter((c) => c.subjectId === subjectFilter);
  }, [chapters, subjectFilter]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (!q.published) return false;
      if (boardFilter !== 'all' && q.boardId !== boardFilter) return false;
      if (classFilter !== 'all' && q.classId !== classFilter) return false;
      if (subjectFilter !== 'all' && q.subjectId !== subjectFilter) return false;
      if (chapterFilter !== 'all' && q.chapterId !== chapterFilter) return false;
      if (priorityFilter !== 'all' && q.priority !== priorityFilter) return false;
      if (typeFilter !== 'all' && q.questionType !== typeFilter) return false;
      if (marksFilter !== 'all' && String(q.marks) !== marksFilter) return false;
      if (
        search.trim() &&
        !q.questionText.toLowerCase().includes(search.toLowerCase()) &&
        !q.topicName.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    questions,
    boardFilter,
    classFilter,
    subjectFilter,
    chapterFilter,
    priorityFilter,
    typeFilter,
    marksFilter,
    search,
  ]);

  const uniqueMarks = useMemo(
    () => Array.from(new Set(questions.map((q) => q.marks))).sort((a, b) => a - b),
    [questions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Curriculum Question Bank ({filtered.length})
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Filter practice questions by board, class, subject, chapter, marks, priority (RED Very Important, YELLOW Important, GREEN Additional Practice), and question type.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic or question..."
            className="w-full pl-9 pr-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={boardFilter}
          onChange={(e) => {
            setBoardFilter(e.target.value);
            setSubjectFilter('all');
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Boards</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setSubjectFilter('all');
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className}
            </option>
          ))}
        </select>

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Subjects</option>
          {visibleSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subjectName}
            </option>
          ))}
        </select>

        <select
          value={chapterFilter}
          disabled={subjectFilter === 'all'}
          onChange={(e) => setChapterFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
        >
          <option value="all">All Chapters</option>
          {visibleChapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              Ch {ch.chapterNumber}: {ch.chapterName}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Priorities</option>
          <option value="RED">RED · Very Important</option>
          <option value="YELLOW">YELLOW · Important</option>
          <option value="GREEN">GREEN · Additional Practice</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Question Types</option>
          {ALL_QUESTION_TYPES.map((qt) => (
            <option key={qt} value={qt}>
              {qt}
            </option>
          ))}
        </select>

        <select
          value={marksFilter}
          onChange={(e) => setMarksFilter(e.target.value)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Marks</option>
          {uniqueMarks.map((m) => (
            <option key={m} value={String(m)}>
              {m} {m === 1 ? 'Mark' : 'Marks'}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
          No questions match the selected filters. Adjust a filter or explore Tests to auto-generate syllabus practice questions.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const subj = subjects.find((s) => s.id === q.subjectId);
            const ch = chapters.find((c) => c.id === q.chapterId);
            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    {subj?.subjectName || q.subjectId} · {ch?.chapterName || q.topicName} · {q.questionType} ·{' '}
                    {q.marks} Marks · {q.sourceType}
                  </span>
                  <PriorityText priority={q.priority} />
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {q.questionText}
                </p>
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [q.id]: !p[q.id] }))}
                  className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {expanded[q.id] ? 'Hide Solution' : 'Show Solution & Explanation'}
                </button>
                {expanded[q.id] && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line space-y-1">
                    {q.correctAnswer && <p className="font-bold">Answer: {q.correctAnswer}</p>}
                    {q.correctAnswers && q.correctAnswers.length > 0 && (
                      <p className="font-bold">Answers: {q.correctAnswers.join(', ')}</p>
                    )}
                    {q.matchPairs && q.matchPairs.length > 0 && (
                      <p className="font-bold">
                        Pairs: {q.matchPairs.map((p) => `${p.left} -> ${p.right}`).join('; ')}
                      </p>
                    )}
                    <p>{q.modelAnswer || q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PyqBankPage: React.FC = () => {
  const { questions, boards, classes, subjects, chapters, studentProfile } = useApp();
  const [tab, setTab] = useState<'verified' | 'predicted'>('verified');

  const [boardFilter, setBoardFilter] = useState<string>(studentProfile?.boardId || 'all');
  const [classFilter, setClassFilter] = useState<string>(studentProfile?.classId || 'all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [marksFilter, setMarksFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const visibleSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (boardFilter !== 'all' && s.boardId !== boardFilter) return false;
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      return true;
    });
  }, [subjects, boardFilter, classFilter]);

  const visibleChapters = useMemo(() => {
    if (subjectFilter === 'all') return [];
    return chapters.filter((c) => c.subjectId === subjectFilter);
  }, [chapters, subjectFilter]);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const q of questions) {
      for (const y of q.verifiedYears || []) yrs.add(y);
    }
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [questions]);

  const availableMarks = useMemo(
    () => Array.from(new Set(questions.map((q) => q.marks))).sort((a, b) => a - b),
    [questions]
  );

  const matchesFilters = (q: (typeof questions)[number]) => {
    if (!q.published) return false;
    if (boardFilter !== 'all' && q.boardId !== boardFilter) return false;
    if (classFilter !== 'all' && q.classId !== classFilter) return false;
    if (subjectFilter !== 'all' && q.subjectId !== subjectFilter) return false;
    if (chapterFilter !== 'all' && q.chapterId !== chapterFilter) return false;
    if (yearFilter !== 'all' && !(q.verifiedYears || []).includes(yearFilter)) return false;
    if (marksFilter !== 'all' && String(q.marks) !== marksFilter) return false;
    if (typeFilter !== 'all' && q.questionType !== typeFilter) return false;
    return true;
  };

  const verifiedPyqs = useMemo(
    () =>
      questions.filter(
        (q) => q.isPyq && q.verificationStatus === 'Verified Official' && matchesFilters(q)
      ),
    [questions, boardFilter, classFilter, subjectFilter, chapterFilter, yearFilter, marksFilter, typeFilter]
  );

  const predictedOrCurated = useMemo(
    () => questions.filter((q) => !q.isPyq && matchesFilters(q)),
    [questions, boardFilter, classFilter, subjectFilter, chapterFilter, yearFilter, marksFilter, typeFilter]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Previous Year Question (PYQ) Bank
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Strict Verification Policy: Only questions linked to a verified board paper display verified exam years and repeat counts. Practice and AI-generated items remain strictly separated.
        </p>
      </div>

      {/* Comprehensive 7-Dimension PYQ Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          value={boardFilter}
          onChange={(e) => {
            setBoardFilter(e.target.value);
            setSubjectFilter('all');
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Boards</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setSubjectFilter('all');
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className}
            </option>
          ))}
        </select>

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setChapterFilter('all');
          }}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Subjects</option>
          {visibleSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subjectName}
            </option>
          ))}
        </select>

        <select
          value={chapterFilter}
          disabled={subjectFilter === 'all'}
          onChange={(e) => setChapterFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
        >
          <option value="all">All Chapters</option>
          {visibleChapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              Ch {ch.chapterNumber}: {ch.chapterName}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Examination Years</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              Exam Year {y}
            </option>
          ))}
        </select>

        <select
          value={marksFilter}
          onChange={(e) => setMarksFilter(e.target.value)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Marks</option>
          {availableMarks.map((m) => (
            <option key={m} value={String(m)}>
              {m} {m === 1 ? 'Mark' : 'Marks'}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        >
          <option value="all">All Question Types</option>
          {ALL_QUESTION_TYPES.map((qt) => (
            <option key={qt} value={qt}>
              {qt}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setBoardFilter('all');
            setClassFilter('all');
            setSubjectFilter('all');
            setChapterFilter('all');
            setYearFilter('all');
            setMarksFilter('all');
            setTypeFilter('all');
          }}
          className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setTab('verified')}
          className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer ${
            tab === 'verified' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Verified Board PYQs ({verifiedPyqs.length})
        </button>
        <button
          onClick={() => setTab('predicted')}
          className={`px-4 py-2 text-xs font-semibold rounded-md cursor-pointer ${
            tab === 'predicted' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Curated &amp; Practice Bank ({predictedOrCurated.length})
        </button>
      </div>

      {tab === 'verified' ? (
        verifiedPyqs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <FileCheck2 className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
              <span>No Verified Board Examination Papers Match This Filter</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Per our academic integrity standard, we never fabricate missing examination years or past paper repeat counts. Switch to &quot;Curated &amp; Practice Bank&quot; for syllabus practice questions, or clear your filters to view all uploaded verified papers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedPyqs.map((q) => {
              const subj = subjects.find((s) => s.id === q.subjectId);
              const ch = chapters.find((c) => c.id === q.chapterId);
              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Appearances: {q.verifiedAppearances || q.verifiedYears?.length || 1} ({q.verifiedYears?.join(', ')})
                    </span>
                    <PriorityText priority={q.priority} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                  <p className="text-xs text-slate-500">
                    {subj?.subjectName} · {ch?.chapterName} · {q.questionType} · {q.marks} Marks · Source:{' '}
                    {q.sourceDocumentRef}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {predictedOrCurated.map((q) => {
            const subj = subjects.find((s) => s.id === q.subjectId);
            const ch = chapters.find((c) => c.id === q.chapterId);
            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    {q.aiGenerated ? 'AI-Generated Practice Question' : q.sourceType} ·{' '}
                    <CurriculumStatusText status={q.verificationStatus} />
                  </span>
                  <PriorityText priority={q.priority} />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                <p className="text-xs text-slate-500">
                  {subj?.subjectName} · {ch?.chapterName} · {q.questionType} · {q.marks} Marks
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
