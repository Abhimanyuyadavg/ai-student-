import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-4-hydrogen';

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      const isTransient = status === 429 || status === 503 || status === 500;
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export interface InlineImagePart {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string; // raw base64 data
}

export interface TeachContext {
  studentName: string;
  boardName: string;
  className: string;
  sessionName: string;
  streamName: string;
  medium: 'Hindi' | 'English' | 'Hindi + English';
  subjectName: string;
  chapterName?: string;
  chapterSummary?: string;
  preparationLevel: string;
  completedChaptersCount: number;
  weakSubjects: string[];
  averageScore?: number | null;
  learningMode: string;
  currentStep?: number;
  customAdminInstruction?: string;
  history: { role: 'user' | 'assistant'; content: string; inlineImages?: InlineImagePart[] }[];
  message: string;
  inlineImages?: InlineImagePart[];
}

function getSubjectPedagogyRules(subjectName: string): string {
  const s = subjectName.toLowerCase();
  if (s.includes('math') || s.includes('गणित')) {
    return 'MATHEMATICS RULES: Explain formulas clearly, show step-by-step solutions, provide worked examples, highlight common calculation mistakes, and offer theorem intuition and numerical practice.';
  }
  if (
    s.includes('science') ||
    s.includes('physics') ||
    s.includes('chemistry') ||
    s.includes('biology') ||
    s.includes('विज्ञान') ||
    s.includes('भौतिक') ||
    s.includes('रसायन') ||
    s.includes('जीव')
  ) {
    return 'SCIENCE RULES: Include precise definitions, scientific laws/principles, balanced chemical equations (with states where relevant), numerical steps with SI units, clear text-based diagram descriptions, and lab/practical connections.';
  }
  if (
    s.includes('accountancy') ||
    s.includes('business') ||
    s.includes('economics') ||
    s.includes('commerce') ||
    s.includes('लेखा')
  ) {
    return 'COMMERCE RULES: Provide journal entry formats, ledger/balance-sheet working notes, accounting principles, economic graphs/schedules described clearly, management principles with case examples, and exact numerical calculations.';
  }
  if (
    s.includes('social') ||
    s.includes('history') ||
    s.includes('geography') ||
    s.includes('political') ||
    s.includes('sociology') ||
    s.includes('psychology') ||
    s.includes('सामाजिक') ||
    s.includes('इतिहास')
  ) {
    return 'SOCIAL SCIENCE / ARTS RULES: Structure chronologically or thematically with key dates, events, cause-and-effect chains, constitutional articles/concepts, map/diagram references, and bullet-structured short & long board answers.';
  }
  if (s.includes('hindi') || s.includes('हिन्दी') || s.includes('गोधूलि')) {
    return 'HINDI RULES: Cover author/poet introduction, chapter summary (सारांश), poetic stanza meanings (भावार्थ), grammar (व्याकरण), writing skills (पत्र/निबंध), and board-style questions in clean Hindi.';
  }
  if (s.includes('english')) {
    return 'ENGLISH RULES: Explain prose/poetry clearly, provide chapter summaries, Hindi word meanings if medium is Hindi or Hindi + English, accurate grammar rules, comprehension strategies, and formal letter/essay writing formats.';
  }
  if (s.includes('sanskrit') || s.includes('संस्कृत') || s.includes('पीयूषम्')) {
    return 'SANSKRIT RULES: Provide Sanskrit text breakdown, word-by-word meanings (शब्दार्थ), Hindi translation (हिन्दी अनुवाद), Sandhi/Samas/Pratyaya grammar notes, Shloka explanation, and Sanskrit Q&A practice.';
  }
  return 'GENERAL BOARD SUBJECT RULES: Adapt explanations strictly to the chosen subject, board blueprint, marking scheme, and student preparation level.';
}

export async function generateAiTeacherResponse(ctx: TeachContext): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const languageInstruction =
    ctx.medium === 'Hindi'
      ? 'Respond primarily in clear, natural Hindi (Devanagari script), keeping technical board terms clear.'
      : ctx.medium === 'Hindi + English'
      ? 'Respond bilingually (Hinglish / Hindi + English side-by-side) so concepts are effortless to grasp while retaining English board terminology.'
      : 'Respond in clear, encouraging English suitable for school board students.';

  const systemInstruction = `You are the AI Personal Teacher on the AI STUDENTS platform.

APP OWNER & OFFICIAL IDENTITY (MANDATORY):
- Official Application Name: AI STUDENTS
- Official Owner & Founder: ABHIMANYU OFFICIAL HACKER
- Whenever a student asks "Who is the owner of this app?", "Who created AI STUDENTS?", "Who is the founder?", "Who developed this application?", or similar ownership/creator questions in Hindi or English, you MUST answer consistently and clearly:
  "AI STUDENTS के owner और founder ABHIMANYU OFFICIAL HACKER हैं।"
- Never invent or substitute a different owner's name, and do not falsely claim that the owner personally wrote individual lines of code.

STUDENT CONTEXT:
- Name: ${ctx.studentName}
- Board: ${ctx.boardName}
- Class: ${ctx.className}
- Academic Session: ${ctx.sessionName}
- Stream: ${ctx.streamName}
- Medium: ${ctx.medium}
- Subject: ${ctx.subjectName}
- Chapter: ${ctx.chapterName || 'General Subject Guidance'}
- Preparation Level: ${ctx.preparationLevel}
- Completed Chapters: ${ctx.completedChaptersCount}
- Average Test Score: ${ctx.averageScore !== null && ctx.averageScore !== undefined ? `${ctx.averageScore}%` : 'No tests taken yet'}
- Weak Subjects: ${ctx.weakSubjects.length ? ctx.weakSubjects.join(', ') : 'None specified'}
- Learning Mode: ${ctx.learningMode}
- Active 10-Step Workflow Stage: ${ctx.currentStep ? `Step ${ctx.currentStep} of 10` : 'Guided Tutoring'}

VERIFIED CURRICULUM CONTEXT:
${ctx.chapterSummary || 'Teach strictly within standard board-aligned concepts for this class and board.'}

10-STEP TEACHING WORKFLOW:
1. Chapter Introduction -> 2. Topic-by-Topic Explanation -> 3. Definitions & Key Concepts -> 4. Worked Examples -> 5. Simpler Language Breakdown -> 6. Important Questions -> 7. Practice Exercises -> 8. Chapter Check/Mini-Test -> 9. Mistake Analysis -> 10. Revision Recommendation.

${getSubjectPedagogyRules(ctx.subjectName)}

${ctx.customAdminInstruction ? `ADMIN PEDAGOGY GUIDELINES:\n${ctx.customAdminInstruction}\n` : ''}

IMAGE & QUESTION PHOTO ANALYSIS INSTRUCTIONS:
- When the student attaches one or more photos (printed textbook questions, handwritten notes, homework, diagrams, numerical problems, grammar exercises, chemical equations, or exam questions):
  1. Carefully read every word, symbol, equation, label, and number visible in the image(s).
  2. Start by briefly restating/reading the detected question or problem and identifying the Subject & Topic.
  3. Explain the underlying concept in simple, encouraging student-friendly language (${ctx.medium}).
  4. Provide a complete step-by-step solution, clearly stating formulas/rules/principles applied and highlighting the exact Final Answer.
  5. If the student asks follow-up questions about an earlier image in this chat, refer directly to the previously uploaded image content cleanly.
  6. HONESTY RULE FOR UNREADABLE IMAGES: If the photo is too blurry, dark, cropped, or illegible to read reliably, DO NOT guess or invent numbers/questions — clearly state which part cannot be read and politely ask the student to upload a clearer, well-lit photo.

MASTER RULES (STRICTLY ENFORCED):
1. Teach strictly according to ${ctx.boardName} for ${ctx.className} (${ctx.sessionName}) in subject "${ctx.subjectName}". Never mix syllabuses from other boards or switch to another subject unless the student's uploaded question clearly asks about it.
2. ${languageInstruction}
3. NEVER invent official syllabus claims, board notifications, or historical previous-year question appearances/years.
4. Clearly distinguish factual concepts from practice/predicted exam questions. Never claim a predicted question is guaranteed to appear, and never guarantee board marks.
5. Tailor explanation depth to marks weightage (e.g., 1-mark MCQ vs 2-mark short vs 5-mark long answer) and to the student's level (${ctx.preparationLevel}).
6. Correct mistakes gently and constructively. Never shame the student.
7. Keep content age-appropriate, encouraging, and remind students to take short healthy breaks when studying long sessions.`;

  const toParts = (text: string, imgs?: InlineImagePart[]) => {
    const parts: any[] = [];
    if (Array.isArray(imgs)) {
      for (const img of imgs.slice(0, 4)) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }
    parts.push({ text });
    return parts;
  };

  const conversationTurns = [
    ...ctx.history.slice(-10).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: toParts(m.content || '(Question image)', m.inlineImages),
    })),
    { role: 'user', parts: toParts(ctx.message, ctx.inlineImages) },
  ];

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: conversationTurns,
      config: {
        systemInstruction,
      },
    })
  );

  return response.text || 'I could not generate an explanation right now. Please try rephrasing your question.';
}

export interface WrittenEvalInput {
  boardName: string;
  className: string;
  subjectName: string;
  medium: string;
  questionText: string;
  maxMarks: number;
  modelAnswer: string;
  rubricPoints: string[];
  studentAnswer: string;
}

export interface WrittenEvalOutput {
  estimatedMarks: number;
  maxMarks: number;
  strengths: string[];
  missingKeyPoints: string[];
  mistakes: string[];
  expectedModelSummary: string;
  structureAdvice: string;
  constructiveFeedback: string;
  disclaimer: string;
}

export async function evaluateWrittenAnswer(input: WrittenEvalInput): Promise<WrittenEvalOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `Strictly grade this student's written board exam answer using board-marking standards.
Board: ${input.boardName} (${input.className}), Subject: ${input.subjectName}, Preferred Medium: ${input.medium}
Question (${input.maxMarks} marks): ${input.questionText}
Required Rubric Points: ${input.rubricPoints.join(' | ') || 'Factual accuracy, key definitions/formulas, logical steps, completeness, and language clarity'}
Model Answer Reference: ${input.modelAnswer}

Student's Written Answer:
"""
${input.studentAnswer}
"""

STRICT GRADING RULES (CRITICAL):
- Check factual correctness, coverage of required rubric points, formulas/definitions/examples (where applicable), grammar/spelling clarity, and answer completeness relative to ${input.maxMarks} marks.
- NEVER award full marks automatically or out of politeness!
  - If the answer is irrelevant, factually incorrect, gibberish, or just repeats the question, award 0 or 0.5 marks max.
  - If the answer is overly brief/vague (e.g., 1 short sentence for a 3–5 mark question) or omits major key points/formulas/steps, deduct marks proportionally and explain what is missing.
  - Award near-full or full marks ONLY when the student clearly covers the core concepts, key points, and required steps/formulas accurately.
- Return scores in 0.5 increments between 0 and ${input.maxMarks}.
- List concrete strengths (empty array if incorrect), specific mistakes/inaccuracies, missing key rubric points, a concise expectedModelSummary, structureAdvice, and constructiveFeedback.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an experienced, fair, and strict school board examiner providing practice rubric evaluations. Never give unearned full marks. Always identify missing points, factual mistakes, formula/definition gaps, and grammar/presentation improvements.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedMarks: { type: Type.NUMBER },
            maxMarks: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            expectedModelSummary: { type: Type.STRING },
            structureAdvice: { type: Type.STRING },
            constructiveFeedback: { type: Type.STRING },
          },
          required: [
            'estimatedMarks',
            'maxMarks',
            'strengths',
            'missingKeyPoints',
            'mistakes',
            'expectedModelSummary',
            'structureAdvice',
            'constructiveFeedback',
          ],
        },
      },
    })
  );

  const parsed = JSON.parse((response.text || '{}').trim());
  const rawScore = Number(parsed.estimatedMarks);
  const clamped = Number.isFinite(rawScore)
    ? Math.round(Math.min(input.maxMarks, Math.max(0, rawScore)) * 2) / 2
    : 0;

  return {
    estimatedMarks: clamped,
    maxMarks: input.maxMarks,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    missingKeyPoints: Array.isArray(parsed.missingKeyPoints) ? parsed.missingKeyPoints : [],
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
    expectedModelSummary: parsed.expectedModelSummary || input.modelAnswer || 'Review key definitions, steps, and conclusion.',
    structureAdvice: parsed.structureAdvice || 'Organize your answer with clear definitions, formulas/points, and a concluding summary.',
    constructiveFeedback: parsed.constructiveFeedback || 'Compare your response with the missing rubric points below and revise the chapter notes.',
    disclaimer: 'AI practice evaluation based on board rubric — not an official board examination grade.',
  };
}

export async function generatePracticeQuestions(params: {
  boardName: string;
  className: string;
  subjectName: string;
  chapterName: string;
  medium: string;
  questionType: 'MCQ' | 'Short Answer' | 'Long Answer';
  count: number;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `Create ${params.count} ${params.questionType} practice questions strictly for ${params.boardName} ${params.className}, Subject: ${params.subjectName}, Chapter: ${params.chapterName}, Medium: ${params.medium}.
CRITICAL:
- Every question MUST belong strictly to "${params.subjectName}" and chapter "${params.chapterName}". Do NOT generate Mathematics or other-subject questions unless Subject is Mathematics.
- These are AI-generated syllabus practice questions (NOT historical previous-year questions). Do NOT attach exam years or claim they appeared in past board exams.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Generate accurate, syllabus-aligned practice questions strictly for the requested subject. For MCQs provide 4 distinct options and the exact matching correctAnswer string. Provide clear explanations and rubricPoints for written questions.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              topicName: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              modelAnswer: { type: Type.STRING },
              rubricPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              marks: { type: Type.INTEGER },
              priority: { type: Type.STRING },
            },
            required: ['questionText', 'topicName', 'explanation', 'marks', 'priority'],
          },
        },
      },
    })
  );

  const items = JSON.parse((response.text || '[]').trim());
  return Array.isArray(items) ? items : [];
}

export async function generateSubjectTestSet(params: {
  boardId: string;
  boardName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  topicName?: string;
  testCategory: string;
  medium: string;
  count: number;
  includeWritten?: boolean;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const typesAllowed = params.includeWritten
    ? 'MCQ, Multiple Correct, True/False, Fill in the Blanks, Short Answer, Long Answer, Numerical'
    : 'MCQ, Multiple Correct, True/False, Fill in the Blanks';

  const prompt = `Generate EXACTLY ${params.count} distinct, diverse board-pattern practice questions strictly for:
- Board: ${params.boardName}
- Class: ${params.className}
- Subject: ${params.subjectName}
- Chapter/Scope: ${params.chapterName || 'Full Subject Syllabus'}${params.topicName ? ` (Topic focus: ${params.topicName})` : ''}
- Test Category: ${params.testCategory}
- Language Medium: ${params.medium}
- Allowed Question Types: ${typesAllowed}

RULES:
1. You MUST return an array containing EXACTLY ${params.count} distinct question objects. Do not stop after 1 question.
2. NEVER include Mathematics questions when Subject is "${params.subjectName}" (unless Subject itself is Mathematics). Stay 100% inside ${params.subjectName}.
3. For "MCQ": give 4 distinct options and exact matching "correctAnswer".
4. For "Multiple Correct": give 4 distinct options and "correctAnswers" array with 2 or 3 exact matching strings from options.
5. For "True/False": options MUST be ["True", "False"] and "correctAnswer" must be "True" or "False".
6. For "Fill in the Blanks": include "_____" in questionText and a short exact "correctAnswer" word/phrase.
7. For "Short Answer", "Long Answer", "Numerical": include detailed "modelAnswer" and "rubricPoints" array.
8. These are AI-generated syllabus practice items (NOT verified past board papers). Do NOT attach any past exam years.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          `Generate a valid JSON array of EXACTLY ${params.count} syllabus-aligned board practice questions strictly for the given subject and class.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          minItems: Math.max(1, params.count),
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              questionType: { type: Type.STRING },
              topicName: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
              modelAnswer: { type: Type.STRING },
              rubricPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              marks: { type: Type.INTEGER },
              priority: { type: Type.STRING },
            },
            required: ['questionText', 'questionType', 'topicName', 'explanation', 'marks', 'priority'],
          },
        },
      },
    })
  );

  const rawItems = JSON.parse((response.text || '[]').trim());
  const list = Array.isArray(rawItems) ? rawItems : [];
  const validTypes = new Set([
    'MCQ',
    'Multiple Correct',
    'True/False',
    'Fill in the Blanks',
    'Short Answer',
    'Long Answer',
    'Numerical',
  ]);

  return list.map((item: any, idx: number) => {
    const qType = validTypes.has(item.questionType) ? item.questionType : 'MCQ';
    const prio = item.priority === 'RED' || item.priority === 'GREEN' ? item.priority : 'YELLOW';
    return {
      id: `ai_gen_${params.subjectId}_${Date.now()}_${idx}`,
      boardId: params.boardId,
      classId: params.classId,
      subjectId: params.subjectId,
      chapterId: params.chapterId || `${params.subjectId}_general`,
      topicName: item.topicName || params.topicName || params.chapterName || params.subjectName,
      questionText: String(item.questionText || '').trim(),
      questionType: qType,
      options:
        qType === 'True/False'
          ? ['True', 'False']
          : Array.isArray(item.options) && item.options.length >= 2
          ? item.options.map(String)
          : undefined,
      correctAnswer: item.correctAnswer ? String(item.correctAnswer) : undefined,
      correctAnswers: Array.isArray(item.correctAnswers) ? item.correctAnswers.map(String) : undefined,
      explanation: String(item.explanation || 'Review textbook concepts for this topic.'),
      modelAnswer: item.modelAnswer ? String(item.modelAnswer) : undefined,
      rubricPoints: Array.isArray(item.rubricPoints) ? item.rubricPoints.map(String) : undefined,
      marks: Number(item.marks) > 0 ? Number(item.marks) : qType === 'Long Answer' ? 5 : qType === 'Short Answer' ? 2 : 1,
      priority: prio,
      isPyq: false,
      aiGenerated: true,
      sourceType: 'Predicted Practice',
      verificationStatus: 'Under Review',
      published: true,
    };
  });
}

export async function generateStudyPlanAdvice(params: {
  boardName: string;
  className: string;
  subjects: string[];
  weakSubjects: string[];
  dailyHours: number;
  examDate: string;
  planType: string;
  schoolSchedule: string;
  coachingSchedule: string;
  targetMarks: string;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `Create a realistic, sustainable 7-day sample cycle of study tasks for a ${params.boardName} ${params.className} student.
Plan Type: ${params.planType}, Target: ${params.targetMarks}, Exam Date: ${params.examDate}
Available Daily Self-Study Hours: ${params.dailyHours} hrs/day
School Schedule: ${params.schoolSchedule || 'Morning hours'}
Coaching Schedule: ${params.coachingSchedule || 'None'}
Subjects: ${params.subjects.join(', ')}
Weak Subjects needing extra care: ${params.weakSubjects.join(', ') || 'None'}

Return 14 realistic study tasks spread across days 0..6 (dayOffset 0 to 6), keeping total self-study minutes per day realistic (<= ${params.dailyHours * 60} mins) and including revision & test tasks plus healthy break advice.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Generate realistic, non-exhausting school study tasks. Never overload a student beyond their dailyHours.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryNote: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOffset: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subjectName: { type: Type.STRING },
                  taskType: { type: Type.STRING },
                  timeSlot: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                },
                required: ['dayOffset', 'title', 'subjectName', 'taskType', 'timeSlot', 'durationMinutes'],
              },
            },
          },
          required: ['summaryNote', 'tasks'],
        },
      },
    })
  );

  return JSON.parse((response.text || '{"summaryNote":"","tasks":[]}').trim());
}

export async function generatePdfToolResult(params: {
  action: 'notes' | 'summarize' | 'translate';
  text: string;
  title?: string;
  targetLanguage?: 'English' | 'Hindi' | 'Hindi + English';
  style?: string;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const cleanText = params.text.trim().slice(0, 18000);
  const lang = params.targetLanguage || 'Hindi + English';
  const docTitle = params.title || 'Study PDF Document';

  let taskPrompt = '';
  if (params.action === 'notes') {
    taskPrompt = `Convert the following PDF study content into crisp, structured, exam-ready Study Notes in ${lang}.
Include clearly labeled sections:
1. Key Concepts & Overview
2. Important Definitions
3. Key Formulas / Rules / Dates (if present in text)
4. Bullet-Point Revision Notes
5. Likely 2-Mark & 5-Mark Board Exam Questions with Brief Key Points

Do NOT invent unrelated syllabus claims outside the provided document text.`;
  } else if (params.action === 'summarize') {
    const modeNote =
      params.style === 'quick'
        ? 'Keep it concise and ultra-scannable (quick 2-minute revision).'
        : params.style === 'formulas'
        ? 'Focus heavily on definitions, rules, equations, formulas, and key exam points.'
        : 'Provide a clear section-by-section detailed yet easy-to-understand summary.';
    taskPrompt = `Summarize the following PDF document clearly in ${lang} so a Class 10–12 student can understand every point easily.
${modeNote}
Organize cleanly with headings, bullet points, and a short "Quick Exam Takeaways" section at the end.`;
  } else {
    const direction =
      lang === 'Hindi'
        ? 'Translate the text cleanly and accurately into natural Hindi (Devanagari script), retaining standard scientific/mathematical terms in parentheses where helpful.'
        : lang === 'English'
        ? 'Translate the text cleanly and accurately into clear, natural academic English.'
        : 'Provide a clear bilingual English + Hindi (हिंदी) translation with parallel paragraphs or numbered points so students understand both languages.';
    taskPrompt = `${direction}
Preserve numbers, formulas, headings, and meaning faithfully without omitting content.`;
  }

  const contents = `Document Title: ${docTitle}\n\n${taskPrompt}\n\n--- EXTRACTED PDF TEXT ---\n${cleanText}`;
  const systemInstruction =
    'You are a careful academic study assistant for Indian school students (Class 10, 11, 12). Output clean, readable plain text with numbered headings and clear bullet points (avoid broken HTML tags). Base output strictly on the provided PDF text.';

  let response;
  try {
    response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: { systemInstruction },
      }),
      2
    );
  } catch (err: any) {
    const status = err?.status || err?.code;
    if (status === 503 || status === 429 || status === 500) {
      response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: { systemInstruction },
        }),
        2
      );
    } else {
      throw err;
    }
  }

  return (response.text || '').trim();
}

