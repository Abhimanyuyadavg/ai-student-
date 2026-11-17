import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { StudyTask } from '../types/index.ts';

export const StudyPlannerPage: React.FC = () => {
  const {
    studentProfile,
    subjects,
    boards,
    classes,
    studyPlans,
    studyTasks,
    createStudyPlan,
    updateStudyTask,
    removeStudyTask,
    getApiHeaders,
    showToast,
  } = useApp();

  const [planType, setPlanType] = useState<'30-Day' | '60-Day' | '90-Day' | 'Custom'>('30-Day');
  const [examDate, setExamDate] = useState('2027-02-15');
  const [dailyHours, setDailyHours] = useState<number>(studentProfile?.dailyStudyHours || 3);
  const [schoolSchedule, setSchoolSchedule] = useState('7:30 AM – 1:30 PM');
  const [coachingSchedule, setCoachingSchedule] = useState('4:00 PM – 5:30 PM');
  const [targetMarks, setTargetMarks] = useState(studentProfile?.examGoal || '80%+');
  const [generating, setGenerating] = useState(false);

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskType, setNewTaskType] = useState<StudyTask['taskType']>('Chapter Study');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTaskSlot, setNewTaskSlot] = useState('6:30 PM – 7:30 PM');

  const enrolledSubjects = useMemo(() => {
    if (!studentProfile) return subjects;
    const sel = subjects.filter((s) => studentProfile.selectedSubjectIds.includes(s.id));
    return sel.length > 0 ? sel : subjects.filter((s) => s.boardId === studentProfile.boardId);
  }, [subjects, studentProfile]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile) return;
    setGenerating(true);

    try {
      const headers = await getApiHeaders();
      const board = boards.find((b) => b.id === studentProfile.boardId);
      const cls = classes.find((c) => c.id === studentProfile.classId);
      const weakNames = enrolledSubjects
        .filter((s) => studentProfile.weakSubjectIds.includes(s.id))
        .map((s) => s.subjectName);

      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          boardName: board?.name || 'CBSE',
          className: cls?.className || 'Class 10',
          subjects: enrolledSubjects.map((s) => s.subjectName),
          weakSubjects: weakNames,
          dailyHours,
          examDate,
          planType,
          schoolSchedule,
          coachingSchedule,
          targetMarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate study plan.');

      const start = new Date();
      const daysCount = planType === '30-Day' ? 30 : planType === '60-Day' ? 60 : planType === '90-Day' ? 90 : 45;
      const end = new Date();
      end.setDate(end.getDate() + daysCount);
      const planId = `plan_${Date.now()}`;

      const generatedTasks: StudyTask[] = (data.tasks || []).map((t: any, idx: number) => {
        const d = new Date();
        d.setDate(d.getDate() + (Number(t.dayOffset) || 0));
        const allowedTypes: StudyTask['taskType'][] = [
          'Chapter Study',
          'Revision',
          'Chapter Test',
          'Model Paper',
          'Final Revision',
        ];
        const taskType = allowedTypes.includes(t.taskType) ? t.taskType : 'Chapter Study';
        return {
          id: `task_${Date.now()}_${idx}`,
          studyPlanId: planId,
          studentId: studentProfile.userId,
          title: String(t.title || 'Focused Chapter Study'),
          subjectName: String(t.subjectName || enrolledSubjects[0]?.subjectName || 'Mathematics'),
          taskType,
          scheduledDate: d.toISOString().slice(0, 10),
          timeSlot: String(t.timeSlot || '6:30 PM – 7:30 PM'),
          durationMinutes: Math.min(120, Math.max(25, Number(t.durationMinutes) || 45)),
          status: 'pending',
        };
      });

      await createStudyPlan(
        {
          id: planId,
          studentId: studentProfile.userId,
          planType,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          examDate,
          dailyHours,
          schoolSchedule,
          coachingSchedule,
          targetMarks,
          createdAt: new Date().toISOString(),
        },
        generatedTasks
      );
      showToast(
        data.summaryNote || `Generated a realistic ${planType} timetable with ${generatedTasks.length} scheduled blocks.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Study planner error.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile || !newTaskTitle.trim()) return;
    await updateStudyTask({
      id: `task_${Date.now()}`,
      studyPlanId: studyPlans[0]?.id || 'manual',
      studentId: studentProfile.userId,
      title: newTaskTitle.trim(),
      subjectName: newTaskSubject || enrolledSubjects[0]?.subjectName || 'General',
      taskType: newTaskType,
      scheduledDate: newTaskDate,
      timeSlot: newTaskSlot,
      durationMinutes: 45,
      status: 'pending',
    });
    setNewTaskTitle('');
    showToast('Task added to your timetable.', 'success');
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const normalizedTasks = studyTasks.map((t) =>
    t.status === 'pending' && t.scheduledDate < todayIso ? { ...t, status: 'overdue' as const } : t
  );
  const visibleTasks = normalizedTasks
    .filter((t) => (filterStatus === 'all' ? true : t.status === filterStatus))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Personal Study Planner
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Build a realistic 30-day, 60-day, 90-day, or custom timetable around your school, coaching, and energy limits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Timetable Generator Form */}
        <form
          onSubmit={handleGeneratePlan}
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Generate Realistic Plan
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Plan Duration
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['30-Day', '60-Day', '90-Day', 'Custom'] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPlanType(pt)}
                  className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                    planType === pt
                      ? 'bg-indigo-700 border-indigo-700 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Examination Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Self-Study Hours / Day
              </label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              School Schedule
            </label>
            <input
              type="text"
              value={schoolSchedule}
              onChange={(e) => setSchoolSchedule(e.target.value)}
              className="w-full px-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Coaching Schedule
              </label>
              <input
                type="text"
                value={coachingSchedule}
                onChange={(e) => setCoachingSchedule(e.target.value)}
                className="w-full px-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Target Marks
              </label>
              <input
                type="text"
                value={targetMarks}
                onChange={(e) => setTargetMarks(e.target.value)}
                className="w-full px-3 py-2 text-xs min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Designing Sustainable Schedule...' : 'Generate Study Timetable'}</span>
          </button>
        </form>

        {/* Timetable Tasks List & Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Your Scheduled Tasks ({visibleTasks.length})
              </h2>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['all', 'pending', 'completed', 'overdue'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded capitalize cursor-pointer ${
                      filterStatus === st ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Calendar className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-500">
                  No tasks match this view. Generate a plan on the left or add a study block below.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleTasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3">
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
                          className={`text-sm font-medium ${
                            task.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {task.scheduledDate} · {task.timeSlot} · {task.subjectName} · {task.taskType} (
                          {task.durationMinutes} min)
                        </p>
                      </div>
                    </label>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-medium capitalize ${
                          task.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : task.status === 'overdue'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {task.status}
                      </span>
                      <button
                        onClick={() => removeStudyTask(task.id)}
                        aria-label="Delete study task"
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Custom Task */}
          <form
            onSubmit={handleAddManualTask}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Add Custom Timetable Block
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Revise Trigonometry Identities"
                className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <select
                value={newTaskSubject}
                onChange={(e) => setNewTaskSubject(e.target.value)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {enrolledSubjects.map((s) => (
                  <option key={s.id} value={s.subjectName}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as StudyTask['taskType'])}
                className="px-3 py-2 text-xs leading-relaxed min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="Chapter Study">Chapter Study</option>
                <option value="Revision">Revision</option>
                <option value="Chapter Test">Chapter Test</option>
                <option value="Model Paper">Model Paper</option>
                <option value="Final Revision">Final Revision</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={newTaskSlot}
                  onChange={(e) => setNewTaskSlot(e.target.value)}
                  placeholder="7:00 PM"
                  className="w-28 px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
