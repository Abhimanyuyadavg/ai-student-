import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { CurriculumStatusText, PriorityText } from '../components/StatusText.tsx';
import { AuthImage, ZoomableAuthThumbnail } from '../components/ImageTools.tsx';

export const SubjectsListPage: React.FC = () => {
  const { studentProfile, subjects, chapters, boards, classes, navigate } = useApp();
  const [showAllBoardSubjects, setShowAllBoardSubjects] = useState(false);

  const boardId = studentProfile?.boardId || 'bseb';
  const classId = studentProfile?.classId || 'class_10';
  const streamId = studentProfile?.streamId || 'na';

  const boardSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (s.boardId !== boardId || s.classId !== classId) return false;
      if (!showAllBoardSubjects && studentProfile?.selectedSubjectIds?.length) {
        return studentProfile.selectedSubjectIds.includes(s.id);
      }
      if (classId !== 'class_10' && streamId !== 'na') {
        return s.streamId === streamId || s.streamId === 'na';
      }
      return true;
    });
  }, [subjects, boardId, classId, streamId, showAllBoardSubjects, studentProfile]);

  const activeBoard = boards.find((b) => b.id === boardId);
  const activeClass = classes.find((c) => c.id === classId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeBoard?.name} · {activeClass?.className}
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Your Curriculum Subjects
          </h1>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start">
          <button
            onClick={() => setShowAllBoardSubjects(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              !showAllBoardSubjects
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            My Subjects
          </button>
          <button
            onClick={() => setShowAllBoardSubjects(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              showAllBoardSubjects
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Board Subjects
          </button>
        </div>
      </div>

      {boardSubjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No subjects matched your current board/class filter yet.
          </p>
          <button
            onClick={() => navigate('onboarding')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
          >
            Update Subject Selection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {boardSubjects.map((subj) => {
            const subjChapters = chapters.filter((c) => c.subjectId === subj.id && c.published);
            const completed = subjChapters.filter((c) =>
              studentProfile?.completedChapterIds?.includes(c.id)
            ).length;
            return (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                {subj.coverImageUrl && (
                  <div className="h-32 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    <AuthImage
                      src={subj.coverImageUrl}
                      alt={`${subj.subjectName} cover`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{subj.subjectCode}</span>
                    <CurriculumStatusText status={subj.status} />
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {subj.subjectName}
                  </h2>
                  {subj.prescribedTextbook && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Textbook: {subj.prescribedTextbook}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums pt-1">
                    Theory {subj.theoryMarks} · Practical/Internal {subj.practicalMarks} ·{' '}
                    {subjChapters.length} {subjChapters.length === 1 ? 'Chapter' : 'Chapters'} (
                    {completed} done)
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate('subject-detail', { subjectId: subj.id })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    <span>Open Chapters</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate('ai-teacher', { subjectId: subj.id })}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    AI Teacher
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SubjectDetailPage: React.FC = () => {
  const { navParams, subjects, chapters, studentProfile, toggleChapterCompleted, navigate } = useApp();
  const subject = subjects.find((s) => s.id === navParams.subjectId) || subjects[0];
  const subjChapters = chapters
    .filter((c) => c.subjectId === subject?.id && c.published)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);

  if (!subject) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Subject not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('subjects')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All Subjects</span>
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {subject.coverImageUrl && (
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:block bg-slate-100 dark:bg-slate-800">
              <AuthImage
                src={subject.coverImageUrl}
                alt={`${subject.subjectName} cover`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-slate-500">{subject.subjectCode}</span>
              <CurriculumStatusText status={subject.status} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {subject.subjectName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Prescribed Reference: {subject.prescribedTextbook || 'Board Curriculum'} · Theory{' '}
              {subject.theoryMarks} Marks + Practical/Internal {subject.practicalMarks} Marks ·{' '}
              {subject.examDurationMinutes} mins
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => navigate('ai-teacher', { subjectId: subject.id })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask AI Teacher</span>
          </button>
          <button
            onClick={() => navigate('mock-exam', { subjectId: subject.id })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Subject Mock Exam</span>
          </button>
        </div>
      </div>

      {/* Chapter List */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Chapter Modules ({subjChapters.length})
        </h2>

        {subjChapters.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Chapters for this subject haven’t been added by your Content Manager yet. You can still study any topic in this subject with your AI Teacher right now!
            </p>
            <button
              onClick={() => navigate('ai-teacher', { subjectId: subject.id })}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
            >
              Study {subject.subjectName} with AI Teacher
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {subjChapters.map((ch) => {
              const isDone = studentProfile?.completedChapterIds?.includes(ch.id);
              return (
                <div
                  key={ch.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold">Chapter {ch.chapterNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ch.unitName}</span>
                      <span aria-hidden="true">·</span>
                      <CurriculumStatusText status={ch.syllabusStatus} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {ch.chapterName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {ch.introduction}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => toggleChapterCompleted(ch.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isDone ? 'Completed' : 'Mark Complete'}</span>
                    </button>
                    <button
                      onClick={() =>
                        navigate('chapter-learning', { subjectId: subject.id, chapterId: ch.id })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Learn Chapter</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChapterLearningPage: React.FC = () => {
  const {
    navParams,
    subjects,
    chapters,
    topics,
    questions,
    studentProfile,
    toggleChapterCompleted,
    updateRevisionRecord,
    updateLastStudiedChapter,
    navigate,
    getApiHeaders,
    boards,
    classes,
    showToast,
  } = useApp();

  const chapter = chapters.find((c) => c.id === navParams.chapterId) || chapters[0];
  const subject = subjects.find((s) => s.id === (navParams.subjectId || chapter?.subjectId)) || subjects[0];
  const chapterTopics = topics
    .filter((t) => t.chapterId === chapter?.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const chapterQuestions = questions.filter((q) => q.chapterId === chapter?.id && q.published);

  const [activeTab, setActiveTab] = useState<'learn' | 'practice' | 'questions' | 'revision'>('learn');
  const [topicIdx, setTopicIdx] = useState(0);
  const [revealedExamples, setRevealedExamples] = useState<Record<number, boolean>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [aiPracticeQuestions, setAiPracticeQuestions] = useState<any[]>([]);
  const [generatingPractice, setGeneratingPractice] = useState(false);

  React.useEffect(() => {
    if (subject?.id && chapter?.id) {
      updateLastStudiedChapter(subject.id, chapter.id);
    }
  }, [subject?.id, chapter?.id, updateLastStudiedChapter]);

  if (!chapter || !subject) {
    return <div className="p-8 text-center text-sm text-slate-500">Chapter not found.</div>;
  }

  const mcqs = chapterQuestions.filter((q) => q.questionType === 'MCQ');
  const shortQs = chapterQuestions.filter(
    (q) => q.questionType === 'Short Answer' || q.questionType === 'Very Short Answer'
  );
  const longQs = chapterQuestions.filter(
    (q) => q.questionType === 'Long Answer' || q.questionType === 'Numerical' || q.questionType === 'Case-Based'
  );
  const verifiedPyqs = chapterQuestions.filter((q) => q.isPyq && q.verificationStatus === 'Verified Official');
  const expectedQs = chapterQuestions.filter((q) => !q.isPyq);

  const isDone = studentProfile?.completedChapterIds?.includes(chapter.id);

  const handleGenerateExtraPractice = async () => {
    setGeneratingPractice(true);
    try {
      const headers = await getApiHeaders();
      const board = boards.find((b) => b.id === subject.boardId);
      const cls = classes.find((c) => c.id === subject.classId);
      const res = await fetch('/api/ai/generate-practice', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          boardName: board?.name || 'Board',
          className: cls?.className || 'Class 10',
          subjectName: subject.subjectName,
          chapterName: chapter.chapterName,
          medium: studentProfile?.medium || 'English',
          questionType: 'MCQ',
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate practice questions');
      setAiPracticeQuestions(data.questions || []);
      showToast('Generated 3 practice MCQs (labeled as Practice, not PYQ).', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGeneratingPractice(false);
    }
  };

  const handleScheduleRevision = async () => {
    if (!studentProfile) return;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);
    await updateRevisionRecord({
      id: `rev_${studentProfile.userId}_${chapter.id}`,
      studentId: studentProfile.userId,
      chapterId: chapter.id,
      subjectId: subject.id,
      chapterName: chapter.chapterName,
      stage: 1,
      nextReviewDate: nextDate.toISOString().slice(0, 10),
      lastPerformance: 'Chapter Studied',
      incorrectQuestionIds: [],
      updatedAt: new Date().toISOString(),
    });
    showToast('Added to your Spaced Revision schedule.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('subject-detail', { subjectId: subject.id })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {subject.subjectName}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleScheduleRevision}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Schedule Revision</span>
          </button>
          <button
            onClick={() => toggleChapterCompleted(chapter.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
              isDone
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isDone ? 'Chapter Completed' : 'Mark Completed'}</span>
          </button>
          <button
            onClick={() =>
              navigate('ai-teacher', { subjectId: subject.id, chapterId: chapter.id })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Learn with AI Teacher</span>
          </button>
        </div>
      </div>

      {/* Chapter Title Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono font-semibold">Chapter {chapter.chapterNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{chapter.unitName}</span>
          <span aria-hidden="true">·</span>
          <CurriculumStatusText status={chapter.syllabusStatus} />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {chapter.chapterName}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Source Reference: {chapter.sourceReference}
        </p>

        {/* Segmented Learning Section Tabs */}
        <div className="pt-4 flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {[
            { id: 'learn', label: '1. Concepts, Formulas & Examples' },
            { id: 'practice', label: `2. MCQs (${mcqs.length}) & Short/Long` },
            { id: 'questions', label: '3. PYQs & Expected Questions' },
            { id: 'revision', label: '4. Revision & Chapter Test' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'learn' && (
        <div className="space-y-6">
          {/* 1. Chapter Introduction & Objectives */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Chapter Introduction &amp; Learning Objectives
            </h2>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              {chapter.introduction}
            </p>
            {chapter.learningObjectives.length > 0 && (
              <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                {chapter.learningObjectives.map((obj, idx) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            )}
          </section>

          {/* 2. Complete Explanation + Topic Stepper */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Complete Explanation
            </h2>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {chapter.completeExplanation}
            </p>

            {chapterTopics.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Topic-by-Topic Breakdown ({topicIdx + 1} of {chapterTopics.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      disabled={topicIdx === 0}
                      onClick={() => setTopicIdx((i) => Math.max(0, i - 1))}
                      className="px-3 py-1 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={topicIdx >= chapterTopics.length - 1}
                      onClick={() => setTopicIdx((i) => Math.min(chapterTopics.length - 1, i + 1))}
                      className="px-3 py-1 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                    >
                      Next Topic
                    </button>
                  </div>
                </div>
                {chapterTopics[topicIdx] && (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {chapterTopics[topicIdx].orderIndex}. {chapterTopics[topicIdx].topicName}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {chapterTopics[topicIdx].difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {chapterTopics[topicIdx].content}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Definitions & 4. Important Facts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Important Definitions
              </h2>
              {chapter.definitions.length === 0 ? (
                <p className="text-sm text-slate-500">Ask AI Teacher for key vocabulary definitions.</p>
              ) : (
                <dl className="space-y-3">
                  {chapter.definitions.map((d, i) => (
                    <div key={i} className="pb-3 last:pb-0 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <dt className="text-sm font-bold text-slate-900 dark:text-white">{d.term}</dt>
                      <dd className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{d.meaning}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Important Facts
              </h2>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                {chapter.importantFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* 5. Formulas & Diagrams */}
          {chapter.formulas.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Key Formulas &amp; Rules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {chapter.formulas.map((f, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{f.name}</p>
                    <p className="font-mono text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                      {f.expression}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{f.usage}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Uploaded Chapter Diagrams & Educational Illustrations */}
          {chapter.illustrations && chapter.illustrations.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Chapter Diagrams &amp; Study Illustrations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapter.illustrations.map((ill) => (
                  <div
                    key={ill.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-950/60"
                  >
                    <ZoomableAuthThumbnail
                      src={ill.imageUrl}
                      alt={ill.title}
                      title={ill.title}
                      caption={ill.caption}
                      className="w-full h-48 object-contain rounded-lg bg-white dark:bg-slate-900"
                    />
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ill.title}</h3>
                        <span className="text-[11px] font-medium capitalize text-indigo-700 dark:text-indigo-400">
                          {ill.kind}
                        </span>
                      </div>
                      {ill.caption && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{ill.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Conceptual Diagrams */}
          {chapter.diagrams.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Concept Diagrams
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapter.diagrams.map((diag, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <ChapterSvgDiagram svgType={diag.svgType} title={diag.title} />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{diag.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{diag.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Worked Examples */}
          {chapter.examples.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Worked Examples
              </h2>
              <div className="space-y-4">
                {chapter.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Example {i + 1}: {ex.problem}
                    </p>
                    <button
                      onClick={() =>
                        setRevealedExamples((prev) => ({ ...prev, [i]: !prev[i] }))
                      }
                      className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {revealedExamples[i] ? 'Hide Solution' : 'Show Step-by-Step Solution'}
                    </button>
                    {revealedExamples[i] && (
                      <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {ex.solution}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="space-y-6">
          {/* 7. Important MCQs */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Important MCQs ({mcqs.length} in bank)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target default: 20 MCQs per chapter (admins can expand dynamically per blueprint).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGenerateExtraPractice}
                  disabled={generatingPractice}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingPractice ? 'Generating...' : 'Generate Practice MCQs'}</span>
                </button>
                <button
                  onClick={() =>
                    navigate('mcq-test', { subjectId: subject.id, chapterId: chapter.id })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Start Interactive MCQ Test</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {mcqs.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-500">MCQ #{idx + 1} · {q.marks} Mark</span>
                    <PriorityText priority={q.priority} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                          {String.fromCharCode(65 + oi)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setRevealedAnswers((p) => ({ ...p, [q.id]: !p[q.id] }))
                    }
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {revealedAnswers[q.id] ? 'Hide Answer' : 'View Answer & Explanation'}
                  </button>
                  {revealedAnswers[q.id] && (
                    <div className="p-3 rounded bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                      <p className="font-semibold">Correct Answer: {q.correctAnswer}</p>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}

              {aiPracticeQuestions.map((aq, idx) => (
                <div
                  key={`ai_${idx}`}
                  className="p-4 rounded-lg border border-indigo-200 dark:border-indigo-900 space-y-2"
                >
                  <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                    AI Practice Question (Generated Practice · Not a PYQ)
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{aq.questionText}</p>
                  {Array.isArray(aq.options) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {aq.options.map((opt: string, oi: number) => (
                        <div key={oi} className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                          {String.fromCharCode(65 + oi)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Answer: {aq.correctAnswer} — {aq.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Short & 9. Long Questions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Short-Answer Questions ({shortQs.length})
                </h2>
                <button
                  onClick={() =>
                    navigate('written-test', { subjectId: subject.id, chapterId: chapter.id })
                  }
                  className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Practice Written Test
                </button>
              </div>
              {shortQs.length === 0 ? (
                <p className="text-sm text-slate-500">Add or practice short questions in Written Test.</p>
              ) : (
                shortQs.map((q) => (
                  <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500">{q.marks} Marks</span>
                      <PriorityText priority={q.priority} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {q.modelAnswer}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Long-Answer &amp; Numericals ({longQs.length})
              </h2>
              {longQs.length === 0 ? (
                <p className="text-sm text-slate-500">Ask AI Teacher for 5-mark derivations and proofs.</p>
              ) : (
                longQs.map((q) => (
                  <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500">{q.marks} Marks</span>
                      <PriorityText priority={q.priority} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {q.modelAnswer}
                    </p>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* 10. Verified PYQs */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Verified Previous Year Questions
            </h2>
            {verifiedPyqs.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                No board examination papers have been uploaded and verified for this chapter yet. We never fabricate past examination years. Once an administrator links an official paper in Question Management, verified PYQs and appearance counts appear here.
              </div>
            ) : (
              verifiedPyqs.map((q) => (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      Verified Years: {q.verifiedYears?.join(', ')} ({q.verifiedAppearances} appearances)
                    </span>
                    <PriorityText priority={q.priority} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                  <p className="text-xs text-slate-500">Source: {q.sourceDocumentRef}</p>
                </div>
              ))
            )}
          </section>

          {/* 11. Expected Questions */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Expected &amp; Curated Practice Questions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Important practice items aligned with learning objectives. Expected questions are for preparation only and are never guaranteed to appear in board exams.
              </p>
            </div>
            <div className="space-y-3">
              {expectedQs.map((q) => (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      {q.questionType} · {q.marks} Marks · {q.sourceType}
                    </span>
                    <PriorityText priority={q.priority} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'revision' && (
        <div className="space-y-6">
          {/* 12. Revision Notes & 13. Practice Test */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Quick Revision Notes
            </h2>
            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
              {chapter.revisionNotes}
            </pre>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Ready for the Chapter Test?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verify your understanding with an interactive MCQ test or typed Written Assessment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  navigate('mcq-test', { subjectId: subject.id, chapterId: chapter.id })
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                Take Chapter MCQ Test
              </button>
              <button
                onClick={() =>
                  navigate('written-test', { subjectId: subject.id, chapterId: chapter.id })
                }
                className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Written Answer Practice
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const ChapterSvgDiagram: React.FC<{ svgType?: string; title: string }> = ({ svgType, title }) => {
  if (svgType === 'right-triangle') {
    return (
      <svg viewBox="0 0 280 140" className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-lg" aria-label={title}>
        <polygon points="40,115 220,115 220,25" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-700 dark:text-indigo-400" />
        <rect x="206" y="101" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500" />
        <text x="26" y="122" className="text-[11px] fill-current text-slate-700 dark:text-slate-300">A (θ)</text>
        <text x="226" y="122" className="text-[11px] fill-current text-slate-700 dark:text-slate-300">B (90°)</text>
        <text x="224" y="25" className="text-[11px] fill-current text-slate-700 dark:text-slate-300">C</text>
        <text x="112" y="132" className="text-[10px] fill-current text-slate-500">Adjacent (Base)</text>
        <text x="226" y="75" className="text-[10px] fill-current text-slate-500">Opposite</text>
        <text x="95" y="60" className="text-[10px] fill-current text-indigo-700 dark:text-indigo-400">Hypotenuse</text>
      </svg>
    );
  }
  if (svgType === 'ray-diagram') {
    return (
      <svg viewBox="0 0 280 140" className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-lg" aria-label={title}>
        <line x1="20" y1="70" x2="260" y2="70" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
        <path d="M 220 20 Q 240 70 220 120" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-800 dark:text-slate-200" />
        <line x1="70" y1="70" x2="70" y2="35" stroke="currentColor" strokeWidth="2" className="text-indigo-700 dark:text-indigo-400" />
        <line x1="70" y1="35" x2="228" y2="35" stroke="currentColor" strokeWidth="1.5" className="text-amber-600" />
        <line x1="228" y1="35" x2="115" y2="105" stroke="currentColor" strokeWidth="1.5" className="text-amber-600" />
        <circle cx="165" cy="70" r="2.5" className="fill-current text-rose-600" />
        <text x="161" y="84" className="text-[10px] fill-current text-slate-600 dark:text-slate-400">F</text>
        <circle cx="110" cy="70" r="2.5" className="fill-current text-rose-600" />
        <text x="106" y="84" className="text-[10px] fill-current text-slate-600 dark:text-slate-400">C</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-lg" aria-label={title}>
      <rect x="85" y="14" width="110" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-700 dark:text-indigo-400" />
      <text x="140" y="30" textAnchor="middle" className="text-[10px] fill-current text-slate-800 dark:text-slate-200">Core Concept</text>
      <line x1="140" y1="38" x2="75" y2="76" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
      <line x1="140" y1="38" x2="205" y2="76" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
      <rect x="25" y="76" width="100" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600" />
      <text x="75" y="93" textAnchor="middle" className="text-[10px] fill-current text-slate-700 dark:text-slate-300">Primary Rule</text>
      <rect x="155" y="76" width="100" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-600" />
      <text x="205" y="93" textAnchor="middle" className="text-[10px] fill-current text-slate-700 dark:text-slate-300">Board Application</text>
    </svg>
  );
};
