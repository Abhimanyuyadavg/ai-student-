import React, { useMemo, useState } from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

const REVISION_STAGES = [
  { stage: 1, name: '1st Revision: Understand', desc: 'Read core concepts and examples slowly.' },
  { stage: 2, name: '2nd Revision: Recall Without Notes', desc: 'Summarize definitions & formulas from memory.' },
  { stage: 3, name: '3rd Revision: Write Answers', desc: 'Write full 2-mark & 5-mark answers neatly.' },
  { stage: 4, name: '4th Revision: Correct Mistakes', desc: 'Review errors from past tests.' },
  { stage: 5, name: '5th Revision: Spaced Repeat', desc: 'Scheduled long-term retention check.' },
];

export const RevisionPage: React.FC = () => {
  const {
    chapters,
    subjects,
    questions,
    revisionRecords,
    studentProfile,
    updateRevisionRecord,
    showToast,
  } = useApp();

  const [activeView, setActiveView] = useState<'spaced' | 'flashcards' | 'formulas' | 'mistakes'>('spaced');
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const relevantChapters = useMemo(() => {
    if (!studentProfile) return chapters;
    const enrolled = subjects.filter((s) =>
      studentProfile.selectedSubjectIds.includes(s.id)
    );
    if (enrolled.length === 0) return chapters;
    return chapters.filter((ch) => enrolled.some((s) => s.id === ch.subjectId));
  }, [chapters, subjects, studentProfile]);

  const flashcards = useMemo(() => {
    const items: { front: string; back: string; source: string }[] = [];
    for (const ch of relevantChapters) {
      for (const def of ch.definitions) {
        items.push({ front: def.term, back: def.meaning, source: ch.chapterName });
      }
      for (const f of ch.formulas) {
        items.push({ front: `Formula: ${f.name}`, back: `${f.expression} (${f.usage})`, source: ch.chapterName });
      }
    }
    return items;
  }, [relevantChapters]);

  const incorrectQuestionIds = useMemo(() => {
    const set = new Set<string>();
    for (const rec of revisionRecords) {
      for (const qid of rec.incorrectQuestionIds || []) set.add(qid);
    }
    return Array.from(set);
  }, [revisionRecords]);

  const incorrectQuestions = questions.filter((q) => incorrectQuestionIds.includes(q.id));

  const advanceStage = async (chapterId: string, subjectId: string, chapterName: string, currentStage: number) => {
    if (!studentProfile) return;
    const nextStage = Math.min(5, currentStage + 1) as 1 | 2 | 3 | 4 | 5;
    const daysGap = nextStage === 2 ? 3 : nextStage === 3 ? 7 : nextStage === 4 ? 14 : 21;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysGap);

    await updateRevisionRecord({
      id: `rev_${studentProfile.userId}_${chapterId}`,
      studentId: studentProfile.userId,
      chapterId,
      subjectId,
      chapterName,
      stage: nextStage,
      nextReviewDate: nextDate.toISOString().slice(0, 10),
      lastPerformance: `Completed Stage ${currentStage}`,
      incorrectQuestionIds: [],
      updatedAt: new Date().toISOString(),
    });
    showToast(`Revision updated to Stage ${nextStage}. Next review scheduled for ${nextDate.toISOString().slice(0, 10)}.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Revision &amp; Memory Engine
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          5-stage spaced revision, interactive flashcards, formula sheets, and mistake review.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-fit">
        {[
          { id: 'spaced', label: '5-Stage Spaced Revision' },
          { id: 'flashcards', label: `Flashcards (${flashcards.length})` },
          { id: 'formulas', label: 'Formula & Definition Sheets' },
          { id: 'mistakes', label: `Incorrect Questions (${incorrectQuestions.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              activeView === tab.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'spaced' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {REVISION_STAGES.map((st) => (
              <div
                key={st.stage}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{st.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Chapter Revision Queue
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {relevantChapters.map((ch) => {
                const rec = revisionRecords.find((r) => r.chapterId === ch.id);
                const stage = rec?.stage || 1;
                return (
                  <div key={ch.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        Ch {ch.chapterNumber}: {ch.chapterName}
                      </h3>
                      <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                        Current Stage: {stage}/5 ·{' '}
                        {rec ? `Next review: ${rec.nextReviewDate} (${rec.lastPerformance})` : 'Not started yet'}
                      </p>
                    </div>
                    <button
                      onClick={() => advanceStage(ch.id, ch.subjectId, ch.chapterName, rec ? stage : 0)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rec ? `Complete Stage ${stage}` : 'Start Stage 1'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeView === 'flashcards' && (
        <div className="max-w-xl mx-auto space-y-4">
          {flashcards.length === 0 ? (
            <p className="text-sm text-slate-500">No flashcards available for selected chapters.</p>
          ) : (
            <>
              <div
                onClick={() => setFlipped(!flipped)}
                className="min-h-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer select-none"
              >
                <p className="text-xs text-slate-400">
                  Card {cardIdx + 1} of {flashcards.length} · {flashcards[cardIdx].source}
                </p>
                <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {flipped ? flashcards[cardIdx].back : flashcards[cardIdx].front}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{flipped ? 'Tap to show term' : 'Tap to recall answer'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setCardIdx((i) => (i > 0 ? i - 1 : flashcards.length - 1));
                    setFlipped(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Previous Card
                </button>
                <button
                  onClick={() => {
                    setCardIdx((i) => (i + 1) % flashcards.length);
                    setFlipped(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
                >
                  Next Card
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeView === 'formulas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {relevantChapters.map((ch) => (
            <div
              key={ch.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {ch.chapterName}
              </h2>
              {ch.formulas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Formulas</p>
                  {ch.formulas.map((f, i) => (
                    <div key={i} className="text-xs p-2.5 rounded bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold">{f.name}:</span>{' '}
                      <span className="font-mono text-indigo-700 dark:text-indigo-300">{f.expression}</span>
                    </div>
                  ))}
                </div>
              )}
              {ch.definitions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Key Definitions</p>
                  {ch.definitions.map((d, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">{d.term}:</span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">{d.meaning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeView === 'mistakes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Previously Incorrect Questions
          </h2>
          {incorrectQuestions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No incorrect questions queued right now. Questions you miss in MCQ tests automatically appear here for targeted revision.
            </p>
          ) : (
            <div className="space-y-3">
              {incorrectQuestions.map((q) => (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Correct Answer: {q.correctAnswer}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{q.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
