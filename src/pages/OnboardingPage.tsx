import React, { useMemo, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { MediumType, PrepLevel, StudentProfile } from '../types/index.ts';
import { CurriculumStatusText } from '../components/StatusText.tsx';

export const OnboardingPage: React.FC = () => {
  const {
    appUser,
    studentProfile,
    boards,
    sessions,
    classes,
    streams,
    subjects,
    saveStudentOnboarding,
    navigate,
    showToast,
  } = useApp();

  const [classId, setClassId] = useState(studentProfile?.classId || 'class_10');
  const [boardId, setBoardId] = useState(studentProfile?.boardId || 'bseb');
  const [academicSessionId, setAcademicSessionId] = useState(
    studentProfile?.academicSessionId || '2026_27'
  );
  const [streamId, setStreamId] = useState(studentProfile?.streamId || 'na');
  const [medium, setMedium] = useState<MediumType>(studentProfile?.medium || 'English');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    studentProfile?.selectedSubjectIds || []
  );
  const [weakSubjectIds, setWeakSubjectIds] = useState<string[]>(
    studentProfile?.weakSubjectIds || []
  );
  const [examGoal, setExamGoal] = useState(studentProfile?.examGoal || '80%+');
  const [customGoal, setCustomGoal] = useState('');
  const [preparationLevel, setPreparationLevel] = useState<PrepLevel>(
    studentProfile?.preparationLevel || 'Intermediate'
  );
  const [dailyStudyHours, setDailyStudyHours] = useState<number>(
    studentProfile?.dailyStudyHours || 3
  );
  const [saving, setSaving] = useState(false);

  const effectiveStreamId = classId === 'class_10' ? 'na' : streamId === 'na' ? 'science' : streamId;

  const availableSubjects = useMemo(() => {
    const exact = subjects.filter(
      (s) =>
        s.boardId === boardId &&
        s.classId === classId &&
        (classId === 'class_10' ? s.streamId === 'na' : s.streamId === effectiveStreamId || s.streamId === 'na')
    );
    if (exact.length > 0) return exact;
    // Fallback to same board subjects if specific session/stream combination is being configured by admin
    return subjects.filter((s) => s.boardId === boardId && s.classId === classId);
  }, [subjects, boardId, classId, effectiveStreamId]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(id)) {
        setWeakSubjectIds((w) => w.filter((x) => x !== id));
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const toggleWeakSubject = (id: string) => {
    setWeakSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const validSelected = selectedSubjectIds.filter((id) =>
      availableSubjects.some((s) => s.id === id)
    );
    const finalSubjects =
      validSelected.length > 0 ? validSelected : availableSubjects.map((s) => s.id);

    setSaving(true);
    try {
      const profile: StudentProfile = {
        userId: appUser.uid,
        classId,
        boardId,
        academicSessionId,
        streamId: effectiveStreamId,
        medium,
        selectedSubjectIds: finalSubjects,
        weakSubjectIds: weakSubjectIds.filter((id) => finalSubjects.includes(id)),
        examGoal: examGoal === 'Custom' && customGoal.trim() ? customGoal.trim() : examGoal,
        preparationLevel,
        dailyStudyHours,
        completedChapterIds: studentProfile?.completedChapterIds || [],
        studyStreakDays: studentProfile?.studyStreakDays || 1,
        onboardingCompleted: true,
        notificationPrefs: studentProfile?.notificationPrefs || {
          dailyTasks: true,
          upcomingTests: true,
          revisionReminders: true,
          announcements: true,
        },
        updatedAt: new Date().toISOString(),
      };
      await saveStudentOnboarding(profile);
      navigate('dashboard');
    } catch (err: any) {
      showToast(err?.message || 'Could not save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedBoardObj = boards.find((b) => b.id === boardId);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Configure Your Academic Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Your AI Teacher, chapter curriculum, mock exam blueprints, and study timetable adapt directly to these selections. You can update them anytime.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Class Selection */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            1. Select Class
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setClassId(cls.id);
                  setSelectedSubjectIds([]);
                }}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                  classId === cls.id
                    ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-display font-bold text-base text-slate-900 dark:text-white">{cls.className}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {cls.classLevel === 10 ? 'Secondary Board Exam' : 'Senior Secondary Stream'}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Board Selection & 3. Session */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              2. Select Education Board
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setBoardId(board.id);
                    setSelectedSubjectIds([]);
                  }}
                  className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                    boardId === board.id
                      ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {board.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{board.boardCode}</span>
                  </div>
                  <div className="mt-1.5">
                    <CurriculumStatusText status={board.status} />
                  </div>
                </button>
              ))}
            </div>
            {selectedBoardObj && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Pattern Note: {selectedBoardObj.examPatternSummary}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              3. Academic Session
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAcademicSessionId(s.id)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    academicSessionId === s.id
                      ? 'border-indigo-700 bg-indigo-700 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {s.name} ({s.status})
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Stream & 5. Medium */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              4. Select Stream
            </h2>
            {classId === 'class_10' ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Stream selection is not applicable for Class 10. All core subjects are available below.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {streams
                  .filter((st) => st.id !== 'na')
                  .map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setStreamId(st.id);
                        setSelectedSubjectIds([]);
                      }}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        effectiveStreamId === st.id
                          ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{st.name}</div>
                      {st.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {st.description}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              5. Instruction Medium
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {(['English', 'Hindi', 'Hindi + English'] as MediumType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    medium === m
                      ? 'border-indigo-700 bg-indigo-700 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Subjects & 9. Weak Subjects */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                6. Select Your Subjects
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSubjectIds(availableSubjects.map((s) => s.id))}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Select All
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Showing subjects configured for {selectedBoardObj?.boardCode} · {classes.find((c) => c.id === classId)?.className}.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSubjects.map((subj) => {
                const chosen =
                  selectedSubjectIds.length === 0 || selectedSubjectIds.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleSubject(subj.id)}
                    className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 text-left transition-colors cursor-pointer ${
                      selectedSubjectIds.includes(subj.id)
                        ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {subj.subjectName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {subj.subjectCode} · Theory {subj.theoryMarks} + Practical {subj.practicalMarks}
                      </div>
                    </div>
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 mt-0.5 ${
                        selectedSubjectIds.includes(subj.id)
                          ? 'bg-indigo-700 border-indigo-700 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedSubjectIds.includes(subj.id) && <Check className="w-3.5 h-3.5" />}
                    </span>
                    {!chosen && null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              7. Subjects Needing Extra Support (Weak Subjects)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              We allocate extra revision blocks and gentler step-by-step pacing for these subjects.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableSubjects.map((subj) => {
                const isWeak = weakSubjectIds.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleWeakSubject(subj.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isWeak
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    {subj.subjectName}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. Goal, Level & Daily Study Hours */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                8. Examination Goal
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {['60%+', '70%+', '80%+', '90%+', 'Custom'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setExamGoal(g)}
                    className={`px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                      examGoal === g
                        ? 'border-indigo-700 bg-indigo-700 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {examGoal === 'Custom' && (
                <input
                  type="text"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="e.g., 95% District Topper"
                  className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              )}
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                9. Current Preparation Level
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as PrepLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPreparationLevel(lvl)}
                    className={`px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                      preparationLevel === lvl
                        ? 'border-indigo-700 bg-indigo-700 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                10. Available Daily Self-Study Hours
              </h2>
              <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                {dailyStudyHours} hrs / day
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={dailyStudyHours}
              onChange={(e) => setDailyStudyHours(Number(e.target.value))}
              className="mt-3 w-full accent-indigo-700"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1 tabular-nums">
              <span>1 hr</span>
              <span>5 hrs</span>
              <span>10 hrs</span>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4">
          {studentProfile?.onboardingCompleted && (
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save & Enter Dashboard'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
