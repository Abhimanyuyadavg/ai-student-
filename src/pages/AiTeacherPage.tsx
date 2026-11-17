import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { AuthImage, ImageLightboxModal } from '../components/ImageTools.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import { AiChatMessage, AiImageAttachment, MediumType } from '../types/index.ts';

interface PendingPhotoItem {
  localId: string;
  file: File;
  fileName: string;
  mimeType?: string;
  previewUrl: string;
  status: 'uploading' | 'ready' | 'error';
  imageId?: string;
  url?: string;
  error?: string;
}

const TEACHING_STEPS = [
  { step: 1, label: '1. Chapter Introduction' },
  { step: 2, label: '2. Topic-by-Topic Explanation' },
  { step: 3, label: '3. Definitions & Concepts' },
  { step: 4, label: '4. Worked Examples' },
  { step: 5, label: '5. Simpler Language Breakdown' },
  { step: 6, label: '6. Important Questions' },
  { step: 7, label: '7. Practice Exercises' },
  { step: 8, label: '8. Quick Chapter Check' },
  { step: 9, label: '9. Mistake Analysis' },
  { step: 10, label: '10. Recommend Revision' },
];

export const AiTeacherPage: React.FC = () => {
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
    navParams,
    getApiHeaders,
    aiPrompts,
    aiChatHistories,
    saveAiChatHistory,
    updateLastStudiedChapter,
    addStudyMinutes,
    uploadImage,
    deleteImage,
    showToast,
  } = useApp();

  const enrolledSubjects = useMemo(() => {
    if (!studentProfile) return subjects;
    const filtered = subjects.filter((s) => studentProfile.selectedSubjectIds.includes(s.id));
    if (filtered.length > 0) return filtered;
    const boardMatches = subjects.filter(
      (s) => s.boardId === studentProfile.boardId && s.classId === studentProfile.classId
    );
    return boardMatches.length > 0 ? boardMatches : subjects;
  }, [studentProfile, subjects]);

  const [subjectId, setSubjectId] = useState<string>(
    navParams.subjectId || enrolledSubjects[0]?.id || subjects[0]?.id || ''
  );

  useEffect(() => {
    if (navParams.subjectId && subjects.some((s) => s.id === navParams.subjectId)) {
      setSubjectId(navParams.subjectId);
    } else if (enrolledSubjects.length > 0 && !enrolledSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(enrolledSubjects[0].id);
    }
  }, [navParams.subjectId, enrolledSubjects, subjects, subjectId]);

  const subjectChapters = useMemo(
    () => chapters.filter((c) => c.subjectId === subjectId && c.published),
    [chapters, subjectId]
  );

  const [chapterId, setChapterId] = useState<string>(
    navParams.chapterId ||
      studentProfile?.lastStudiedChapterBySubject?.[subjectId] ||
      subjectChapters[0]?.id ||
      ''
  );

  useEffect(() => {
    if (navParams.chapterId && subjectChapters.some((c) => c.id === navParams.chapterId)) {
      setChapterId(navParams.chapterId);
      return;
    }
    const remembered = studentProfile?.lastStudiedChapterBySubject?.[subjectId];
    if (remembered && subjectChapters.some((c) => c.id === remembered)) {
      setChapterId(remembered);
      return;
    }
    if (!subjectChapters.some((c) => c.id === chapterId)) {
      setChapterId(subjectChapters[0]?.id || '');
    }
  }, [navParams.chapterId, subjectId, subjectChapters, studentProfile?.lastStudiedChapterBySubject, chapterId]);

  const [medium, setMedium] = useState<MediumType>(studentProfile?.medium || 'English');
  const [learningMode, setLearningMode] = useState('Chapter Guided Learning');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Real AI health status check
  const [aiStatus, setAiStatus] = useState<{ checking: boolean; online: boolean; checkedAt?: string }>({
    checking: true,
    online: false,
  });

  // Voice Input & Spoken Output states
  const [listening, setListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Question Photo Attachments + Lightbox
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoItem[]>([]);
  const [photoErrorBanner, setPhotoErrorBanner] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('Question Photo');

  const checkAiHealth = async () => {
    setAiStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      setAiStatus({
        checking: false,
        online: Boolean(data.aiConfigured && data.aiOnline),
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch {
      setAiStatus({ checking: false, online: false });
    }
  };

  useEffect(() => {
    checkAiHealth();
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedChapter = chapters.find((c) => c.id === chapterId);
  const board = boards.find((b) => b.id === (studentProfile?.boardId || selectedSubject?.boardId));
  const cls = classes.find((c) => c.id === (studentProfile?.classId || selectedSubject?.classId));
  const session = sessions.find((s) => s.id === studentProfile?.academicSessionId);
  const stream = streams.find((st) => st.id === studentProfile?.streamId);

  const defaultWelcomeMessage = useMemo<AiChatMessage>(
    () => ({
      id: `welcome_${subjectId}`,
      role: 'assistant',
      stepLabel: 'Ready to Teach',
      timestamp: new Date().toISOString(),
      content: `Hello ${appUser?.displayName || 'Student'}! I am your AI Personal Teacher for ${
        board?.name || 'your board'
      } (${cls?.className || 'Class 10'} · ${selectedSubject?.subjectName || 'Selected Subject'}). Choose a chapter or any of the 10 guided teaching steps on the left, speak with the microphone, or ask me any concept, definition, numerical, or exam doubt.`,
    }),
    [appUser?.displayName, board?.name, cls?.className, selectedSubject?.subjectName, subjectId]
  );

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    const saved = aiChatHistories[subjectId];
    return saved && saved.length > 0 ? saved : [defaultWelcomeMessage];
  });

  useEffect(() => {
    const saved = aiChatHistories[subjectId];
    setMessages(saved && saved.length > 0 ? saved : [defaultWelcomeMessage]);
  }, [subjectId, aiChatHistories, defaultWelcomeMessage]);

  const processAndUploadQuestionPhoto = async (item: PendingPhotoItem) => {
    try {
      const processed = await validateAndCompressImageFile(item.file, {
        maxDimension: 1600,
        maxBytes: 1_200_000,
      });
      const uploaded = await uploadImage({
        dataUrl: processed.dataUrl,
        category: 'ai_question',
        visibility: 'private',
        altText: `Question photo for ${selectedSubject?.subjectName || 'study'}`,
        targetId: chapterId || subjectId || undefined,
      });
      setPendingPhotos((prev) =>
        prev.map((p) =>
          p.localId === item.localId
            ? {
                ...p,
                status: 'ready',
                imageId: uploaded.image.id,
                url: uploaded.url,
                mimeType: uploaded.image.mimeType,
                error: undefined,
              }
            : p
        )
      );
    } catch (err: any) {
      const msg = err?.message || 'Could not upload photo.';
      setPendingPhotos((prev) =>
        prev.map((p) =>
          p.localId === item.localId
            ? { ...p, status: 'error', error: msg }
            : p
        )
      );
    }
  };

  const handleSelectQuestionFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoErrorBanner('');
    const availableSlots = 4 - pendingPhotos.length;
    if (availableSlots <= 0) {
      setPhotoErrorBanner('You can attach up to 4 photos per question.');
      return;
    }
    const chosen = Array.from(files).slice(0, availableSlots);
    const queued: PendingPhotoItem[] = [];
    for (const file of chosen) {
      if (!/\.(jpe?g|png|webp)$/i.test(file.name) && !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
        setPhotoErrorBanner('Only JPG, JPEG, PNG, and WEBP images are supported.');
        continue;
      }
      const localId = `qimg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const previewUrl = URL.createObjectURL(file);
      queued.push({
        localId,
        file,
        fileName: file.name || 'question_photo.jpg',
        previewUrl,
        status: 'uploading',
      });
    }
    if (queued.length === 0) return;
    setPendingPhotos((prev) => [...prev, ...queued]);
    for (const qItem of queued) {
      void processAndUploadQuestionPhoto(qItem);
    }
  };

  const removePendingPhoto = (localId: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) {
        if (target.previewUrl.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
        if (target.imageId) deleteImage(target.imageId).catch(() => {});
      }
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const retryPendingPhoto = (localId: string) => {
    const target = pendingPhotos.find((p) => p.localId === localId);
    if (!target) return;
    setPendingPhotos((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, status: 'uploading', error: undefined } : p))
    );
    void processAndUploadQuestionPhoto(target);
  };

  const hasUploadingPhoto = pendingPhotos.some((p) => p.status === 'uploading');
  const readyPendingPhotos = pendingPhotos.filter((p) => p.status === 'ready' && p.imageId && p.url);

  const sendMessage = async (
    textToSend: string,
    stepOverride?: number,
    retryAttachments?: AiImageAttachment[]
  ) => {
    const trimmed = textToSend.trim();
    const attachmentsToSend: AiImageAttachment[] = retryAttachments
      ? retryAttachments
      : readyPendingPhotos.map((p) => ({
          id: p.imageId!,
          url: p.url!,
          mimeType: p.mimeType || 'image/jpeg',
          name: p.fileName,
        }));

    if ((!trimmed && attachmentsToSend.length === 0) || loading || hasUploadingPhoto) return;

    const displayContent =
      trimmed ||
      (attachmentsToSend.length === 1
        ? 'Please read and solve this uploaded question photo step by step.'
        : `Please read and explain these ${attachmentsToSend.length} uploaded question photos step by step.`);

    const stepNum = stepOverride || activeStep;
    const userMsg: AiChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      content: displayContent,
      ...(attachmentsToSend.length > 0 ? { attachments: attachmentsToSend } : {}),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    if (!retryAttachments && attachmentsToSend.length > 0) {
      setPendingPhotos((prev) => {
        for (const p of prev) {
          if (p.previewUrl.startsWith('blob:') && p.status === 'ready') {
            URL.revokeObjectURL(p.previewUrl);
          }
        }
        return prev.filter((p) => p.status !== 'ready');
      });
    }
    setLoading(true);

    try {
      if (subjectId && chapterId) {
        updateLastStudiedChapter(subjectId, chapterId).catch(() => {});
      }

      const headers = await getApiHeaders();
      const subjResults = testResults.filter((r) => r.subjectId === subjectId);
      const relevantResults = subjResults.length > 0 ? subjResults : testResults;
      const avgScore =
        relevantResults.length > 0
          ? Math.round(
              relevantResults.reduce(
                (acc, r) => acc + (r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0),
                0
              ) / relevantResults.length
            )
          : null;

      const weakNames = subjects
        .filter((s) => studentProfile?.weakSubjectIds?.includes(s.id))
        .map((s) => s.subjectName);

      const chapterContextText = selectedChapter
        ? `Chapter ${selectedChapter.chapterNumber}: ${selectedChapter.chapterName} (${selectedChapter.syllabusStatus}). Intro: ${selectedChapter.introduction}. Explanation: ${selectedChapter.completeExplanation}. Formulas: ${selectedChapter.formulas.map((f) => `${f.name}: ${f.expression}`).join(' | ')}. Revision Notes: ${selectedChapter.revisionNotes}`
        : undefined;

      const res = await fetch('/api/ai/teach', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentName: appUser?.displayName || 'Student',
          boardName: board?.name || 'Selected Board',
          className: cls?.className || 'Class 10',
          sessionName: session?.name || '2026–27',
          streamName: stream?.name || 'General',
          medium,
          subjectName: selectedSubject?.subjectName || 'Selected Subject',
          chapterName: selectedChapter?.chapterName,
          chapterSummary: chapterContextText,
          preparationLevel: studentProfile?.preparationLevel || 'Intermediate',
          completedChaptersCount: studentProfile?.completedChapterIds?.length || 0,
          weakSubjects: weakNames,
          averageScore: avgScore,
          learningMode,
          currentStep: stepNum,
          customAdminInstruction: aiPrompts[0]?.systemPrompt,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.attachments?.length ? { attachmentIds: m.attachments.map((a) => a.id) } : {}),
          })),
          message: trimmed,
          attachmentIds: attachmentsToSend.map((a) => a.id),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Teacher could not respond.');
      }

      const assistantMsg: AiChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        stepLabel: `Step ${stepNum} · ${selectedSubject?.subjectName || 'Study'}`,
        timestamp: new Date().toISOString(),
        content: data.reply,
      };
      const updatedMsgs = [...nextHistory, assistantMsg];
      setMessages(updatedMsgs);
      if (subjectId) {
        saveAiChatHistory(subjectId, updatedMsgs);
      }
      addStudyMinutes(2).catch(() => {});
    } catch (err: any) {
      showToast(err.message || 'Failed to contact AI Teacher.', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          stepLabel: 'Connection Notice',
          timestamp: new Date().toISOString(),
          content: `I could not complete that response: ${err.message}. Please check AI service status or try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navParams.aiInitialTopic) {
      setInput(navParams.aiInitialTopic);
    }
  }, [navParams.aiInitialTopic]);

  const handleStepClick = (step: number, label: string) => {
    setActiveStep(step);
    const chLabel = selectedChapter
      ? `for "${selectedChapter.chapterName}"`
      : `for ${selectedSubject?.subjectName || 'this subject'}`;
    sendMessage(`Please guide me through ${label} ${chLabel}.`, step);
  };

  const toggleVoiceInput = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Voice input is not supported in this browser. Please type your doubt.', 'info');
      return;
    }
    const recognition = new SpeechRec();
    recognition.lang = medium === 'Hindi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
      showToast('Could not capture voice audio. Check microphone permissions.', 'info');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const toggleSpeakMessage = (msg: AiChatMessage) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Spoken voice output is unavailable in this browser.', 'info');
      return;
    }
    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(msg.content);
    utterance.lang = medium === 'Hindi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.96;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const rememberedChapterId = studentProfile?.lastStudiedChapterBySubject?.[subjectId];
  const rememberedChapter = chapters.find((c) => c.id === rememberedChapterId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Context & 10-Step Pedagogy Deck */}
      <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
          </div>
          <button
            type="button"
            onClick={checkAiHealth}
            title="Check live AI service status"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            {aiStatus.checking ? (
              <span className="text-slate-400">Checking AI...</span>
            ) : aiStatus.online ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                AI Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                AI Offline
              </span>
            )}
            <RefreshCw className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-base font-bold text-slate-900 dark:text-white">
            AI Personal Teacher
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {board?.boardCode || 'Board'} · {cls?.className || 'Class'} · {medium} Medium
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Subject ({enrolledSubjects.length} available)
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                const nextSubj = e.target.value;
                setSubjectId(nextSubj);
                const firstCh = chapters.find((c) => c.subjectId === nextSubj && c.published);
                setChapterId(firstCh?.id || '');
              }}
              className="w-full px-3 py-2.5 text-sm leading-normal min-h-[46px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {enrolledSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Chapter
            </label>
            <select
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                if (subjectId && e.target.value) {
                  updateLastStudiedChapter(subjectId, e.target.value).catch(() => {});
                }
              }}
              className="w-full px-3 py-2.5 text-sm leading-normal min-h-[46px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">General Subject Help</option>
              {subjectChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.chapterNumber}: {c.chapterName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Medium
              </label>
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value as MediumType)}
                className="w-full px-3 py-2.5 text-sm leading-normal min-h-[46px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Hindi + English">Hindi + English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Mode
              </label>
              <select
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value)}
                className="w-full px-3 py-2.5 text-sm leading-normal min-h-[46px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="Chapter Guided Learning">Guided Steps</option>
                <option value="Doubt Solving">Doubt Solving</option>
                <option value="Numerical & Formula Drill">Numerical Drill</option>
                <option value="Interactive Quiz">Interactive Quiz</option>
                <option value="Board Answer Framing">Exam Framing</option>
              </select>
            </div>
          </div>
        </div>

        {rememberedChapter && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setChapterId(rememberedChapter.id);
              sendMessage(
                `Let's continue studying from where I left off in "${rememberedChapter.chapterName}" (${selectedSubject?.subjectName}). Give a brief recap and teach the next key topic.`
              );
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-left cursor-pointer"
          >
            Continue Last Topic: Ch {rememberedChapter.chapterNumber}: {rememberedChapter.chapterName}
          </button>
        )}

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            10-Step Teaching Workflow
          </p>
          <div className="grid grid-cols-1 gap-1">
            {TEACHING_STEPS.map((st) => (
              <button
                key={st.step}
                type="button"
                disabled={loading}
                onClick={() => handleStepClick(st.step, st.label)}
                className={`px-3 py-1.5 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  activeStep === st.step
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[430px] max-h-[680px] lg:max-h-none lg:h-[76vh] lg:min-h-[540px]">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
            Teaching:{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedSubject?.subjectName}
            </span>
            {selectedChapter ? ` · Ch ${selectedChapter.chapterNumber}: ${selectedChapter.chapterName}` : ''}
          </div>
          <button
            type="button"
            onClick={() => {
              const reset = [defaultWelcomeMessage];
              setMessages(reset);
              if (subjectId) saveAiChatHistory(subjectId, reset);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, idx) => {
            const isErrorNotice = msg.id.startsWith('err_');
            const prevUserMsg = isErrorNotice
              ? [...messages].slice(0, idx).reverse().find((m) => m.role === 'user')
              : null;
            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.stepLabel && msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                        {msg.stepLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleSpeakMessage(msg)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => {
                            setLightboxSrc(att.url);
                            setLightboxTitle(att.name || 'Question Photo');
                          }}
                          className="rounded-lg overflow-hidden border border-white/25 dark:border-slate-600 cursor-pointer bg-white"
                        >
                          <AuthImage
                            src={att.url}
                            alt={att.name || 'Attached question photo'}
                            className="h-24 w-auto max-w-[160px] object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {isErrorNotice && prevUserMsg && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        sendMessage(prevUserMsg.content, undefined, prevUserMsg.attachments)
                      }
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-md cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Question</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  AI Teacher is reading your question and preparing your {selectedSubject?.subjectName} explanation...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Topic Prompts */}
        <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          {[
            'Explain in simpler words with an everyday example',
            'Give me a formula / rule sheet for this chapter',
            'Ask me an interactive quiz question on this chapter',
            'Give me 3 practice problems with step-by-step solutions',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(prompt)}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Pending Question Photo Preview Strip */}
        {(pendingPhotos.length > 0 || photoErrorBanner) && (
          <div className="px-4 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-900">
            {photoErrorBanner && (
              <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
                <span>{photoErrorBanner}</span>
                <button
                  type="button"
                  onClick={() => setPhotoErrorBanner('')}
                  className="cursor-pointer"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {pendingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {pendingPhotos.map((item) => (
                  <div
                    key={item.localId}
                    className="relative flex items-center gap-2 p-1.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="w-11 h-11 rounded object-cover border border-slate-200 dark:border-slate-800"
                    />
                    <div className="max-w-[130px] text-[11px]">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.fileName}
                      </p>
                      {item.status === 'uploading' && (
                        <p className="text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </p>
                      )}
                      {item.status === 'ready' && (
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">Ready</p>
                      )}
                      {item.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => retryPendingPhoto(item.localId)}
                          className="text-rose-600 dark:text-rose-400 font-semibold underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingPhoto(item.localId)}
                      aria-label={`Remove ${item.fileName}`}
                      className="absolute top-1 right-1 p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Composer with Voice Input + Question Photo Upload */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              title="Upload question photo (JPG, PNG, WEBP)"
              className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="sr-only">Upload question photo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  handleSelectQuestionFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <label
              title="Capture question photo with camera"
              className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="sr-only">Capture question with camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handleSelectQuestionFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={listening ? 'Stop listening' : 'Speak doubt'}
              className={`p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                listening
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${selectedSubject?.subjectName || 'subject'} doubt or attach question photo...`}
            className="flex-1 min-w-[160px] px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={
              loading ||
              hasUploadingPhoto ||
              (!input.trim() && readyPendingPhotos.length === 0)
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </section>

      <ImageLightboxModal
        src={lightboxSrc}
        title={lightboxTitle}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
};
