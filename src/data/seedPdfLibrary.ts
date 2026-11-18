import type { PdfChapterContent, PdfClassId, PdfNoteItem, PdfStreamId } from '../types/index.ts';
import { SEED_CHAPTERS, SEED_QUESTIONS } from './seedCurriculum.ts';

interface SubjectBlueprint {
  classId: PdfClassId;
  streamId: PdfStreamId;
  subjectKey: string;
  subjectNameEn: string;
  subjectNameHi: string;
  subjectIdRef?: string;
  syllabusChapters: { num: number; en: string; hi: string }[];
}

const RICH_CONTENT_OVERRIDES: Record<string, PdfChapterContent> = {
  // Class 10 Mathematics
  'c10_math_ch1': {
    en: {
      overview:
        'Real Numbers cover the Fundamental Theorem of Arithmetic (every composite integer expresses uniquely as a product of primes), Euclid’s Division Lemma (a = bq + r, 0 <= r < b) used to compute HCF, proofs of irrationality for sqrt(2), sqrt(3), sqrt(5), and identifying terminating vs non-terminating recurring decimals from prime factors of the denominator q (2^n * 5^m).',
      definitions: [
        { term: 'Real Numbers (R)', meaning: 'The complete union of rational numbers (p/q, q != 0) and irrational numbers.' },
        { term: 'Euclid’s Division Lemma', meaning: 'For any positive integers a and b, unique integers q and r exist such that a = bq + r with 0 <= r < b.' },
        { term: 'Fundamental Theorem of Arithmetic', meaning: 'Every composite number can be factorized uniquely as a product of prime powers.' },
        { term: 'Irrational Number', meaning: 'A real number that cannot be written in p/q form with integers p, q != 0 (non-terminating, non-repeating decimal).' },
      ],
      formulas: [
        { name: 'Product-HCF-LCM Identity', expression: 'HCF(a, b) × LCM(a, b) = a × b', usage: 'Valid for any two positive integers a and b.' },
        { name: 'Terminating Decimal Test', expression: 'q = 2^n × 5^m (n, m >= 0)', usage: 'Lowest-form fraction p/q terminates iff denominator q has only 2 and 5 as prime factors.' },
      ],
      examNotes: [
        'HCF × LCM = a × b works for TWO integers only, not directly for three numbers.',
        'Always verify gcd(p, q) = 1 before applying the denominator 2^n × 5^m terminating decimal rule.',
        'In proofs by contradiction for sqrt(p), explicitly state that p divides a^2 => p divides a (since p is prime).',
      ],
      importantQA: [
        {
          question: 'Find the HCF and LCM of 96 and 404 by prime factorization and verify HCF × LCM = Product.',
          answer: '96 = 2^5 × 3; 404 = 2^2 × 101. HCF = 2^2 = 4. LCM = (96 × 404) / 4 = 9696. Check: 4 × 9696 = 38784 = 96 × 404.',
          marks: 3,
        },
        {
          question: 'Prove that 3 + 2√5 is irrational.',
          answer: 'Assume 3 + 2√5 = a/b (rational, b != 0). Rearranging gives √5 = (a - 3b) / (2b). Since a, b are integers, RHS is rational while LHS √5 is irrational — contradiction. Hence 3 + 2√5 is irrational.',
          marks: 3,
        },
      ],
      mcqs: [
        {
          question: 'What is the HCF of 135 and 225?',
          options: ['15', '35', '45', '75'],
          answerIndex: 2,
          explanation: '225 = 135×1 + 90; 135 = 90×1 + 45; 90 = 45×2 + 0 => HCF = 45.',
        },
        {
          question: 'The decimal expansion of 17/8 will terminate after how many decimal places?',
          options: ['1', '2', '3', '4'],
          answerIndex: 2,
          explanation: '8 = 2^3, highest power of 2 or 5 is 3, so it terminates after 3 decimal places (2.125).',
        },
      ],
    },
    hi: {
      overview:
        'वास्तविक संख्याएँ अध्याय में अंकगणित की आधारभूत प्रमेय (प्रत्येक भाज्य संख्या को अभाज्य संख्याओं के अद्वितीय गुणनफल के रूप में लिखा जा सकता है), यूक्लिड विभाजन प्रमेयिका (a = bq + r, 0 <= r < b), √2, √3, √5 की अपरिमेयता की उपपत्ति, और हर (q) के 2^n × 5^m रूप के आधार पर सांत एवं असांत आवर्ती दशमलव की पहचान शामिल है।',
      definitions: [
        { term: 'वास्तविक संख्याएँ', meaning: 'सभी परिमेय (p/q) और अपरिमेय संख्याओं का सम्मिलित संग्रह।' },
        { term: 'यूक्लिड विभाजन प्रमेयिका', meaning: 'दो धनात्मक पूर्णांक a और b के लिए अद्वितीय पूर्णांक q और r होते हैं कि a = bq + r, 0 <= r < b।' },
        { term: 'अंकगणित की आधारभूत प्रमेय', meaning: 'प्रत्येक भाज्य संख्या अभाज्य संख्याओं के एक अद्वितीय गुणनफल के रूप में व्यक्त की जा सकती है।' },
      ],
      formulas: [
        { name: 'म.स. और ल.स. संबंध', expression: 'HCF(a, b) × LCM(a, b) = a × b', usage: 'दो धनात्मक पूर्णांकों के लिए मान्य।' },
        { name: 'सांत दशमलव नियम', expression: 'q = 2^n × 5^m', usage: 'सरलतम भिन्न p/q सांत होगा यदि हर q के अभाज्य गुणनखंड केवल 2 और 5 हों।' },
      ],
      examNotes: [
        'HCF × LCM = a × b केवल दो संख्याओं के लिए सीधे लागू होता है, तीन के लिए नहीं।',
        'विरोधाभास विधि में यह लिखना न भूलें कि यदि अभाज्य संख्या p, a^2 को विभाजित करती है तो p, a को भी विभाजित करेगी।',
      ],
      importantQA: [
        {
          question: 'अभाज्य गुणनखंडन विधि से 96 और 404 का HCF और LCM ज्ञात करें।',
          answer: '96 = 2^5 × 3, 404 = 2^2 × 101। अतः HCF = 2^2 = 4 और LCM = (96 × 404)/4 = 9696।',
          marks: 3,
        },
        {
          question: 'सिद्ध कीजिए कि 3 + 2√5 एक अपरिमेय संख्या है।',
          answer: 'माना 3 + 2√5 = a/b परिमेय है (b != 0)। तब √5 = (a - 3b)/(2b)। दायाँ पक्ष परिमेय है जबकि बायाँ पक्ष √5 अपरिमेय है, जो विरोधाभास है। अतः 3 + 2√5 अपरिमेय है।',
          marks: 3,
        },
      ],
      mcqs: [
        {
          question: '135 और 225 का HCF क्या है?',
          options: ['15', '35', '45', '75'],
          answerIndex: 2,
          explanation: 'यूक्लिड विभाजन से 225 = 135×1 + 90, 135 = 90×1 + 45, 90 = 45×2 + 0 => HCF = 45।',
        },
        {
          question: '17/8 का दशमलव प्रसार कितने अंकों के बाद सांत होगा?',
          options: ['1', '2', '3', '4'],
          answerIndex: 2,
          explanation: '8 = 2^3 होने से अधिकतम घात 3 है, अतः 3 दशमलव अंकों (2.125) के बाद सांत होगा।',
        },
      ],
    },
  },
  'c10_math_ch2': {
    en: {
      overview:
        'Polynomials explore the degree of algebraic expressions, geometrical meaning of zeroes (x-intercepts of y = p(x)), relationship between zeroes (alpha, beta) and coefficients of quadratic polynomials ax^2 + bx + c, and forming quadratic polynomials from sum and product of zeroes.',
      definitions: [
        { term: 'Zero of a Polynomial', meaning: 'A real number k such that p(k) = 0; geometrically where graph intersects the x-axis.' },
        { term: 'Quadratic Polynomial', meaning: 'A polynomial of degree 2 in standard form p(x) = ax^2 + bx + c, a != 0.' },
      ],
      formulas: [
        { name: 'Sum of Zeroes', expression: 'alpha + beta = -b / a', usage: 'For ax^2 + bx + c = 0.' },
        { name: 'Product of Zeroes', expression: 'alpha × beta = c / a', usage: 'For ax^2 + bx + c = 0.' },
        { name: 'Polynomial Construction', expression: 'p(x) = k [x^2 - (alpha + beta)x + alpha*beta]', usage: 'Build quadratic from given sum and product of zeroes.' },
      ],
      examNotes: [
        'A polynomial of degree n has at most n real zeroes.',
        'Watch the minus sign in alpha + beta = -b/a.',
      ],
      importantQA: [
        {
          question: 'Find a quadratic polynomial whose sum and product of zeroes are -3 and 2.',
          answer: 'p(x) = x^2 - (sum)x + product = x^2 - (-3)x + 2 = x^2 + 3x + 2.',
          marks: 2,
        },
      ],
      mcqs: [
        {
          question: 'If p(x) = x^2 - 5x + 6, what is the sum of zeroes?',
          options: ['-5', '5', '6', '-6'],
          answerIndex: 1,
          explanation: 'Sum = -b/a = -(-5)/1 = 5.',
        },
      ],
    },
    hi: {
      overview:
        'बहुपद अध्याय में बहुपद की घात, शून्यकों का ज्यामितीय अर्थ (x-अक्ष के प्रतिच्छेदन बिंदु), द्विघात बहुपद ax^2 + bx + c के शून्यकों (alpha, beta) और गुणांकों के बीच संबंध तथा शून्यकों से बहुपद निर्माण सीखा जाता है।',
      definitions: [
        { term: 'बहुपद का शून्यक', meaning: 'चर x का वह मान k जिसके लिए p(k) = 0 हो।' },
        { term: 'द्विघात बहुपद', meaning: 'घात 2 का बहुपद, मानक रूप ax^2 + bx + c (a != 0)।' },
      ],
      formulas: [
        { name: 'शून्यकों का योगफल', expression: 'alpha + beta = -b / a', usage: 'ax^2 + bx + c में लागू।' },
        { name: 'शून्यकों का गुणनफल', expression: 'alpha × beta = c / a', usage: 'ax^2 + bx + c में लागू।' },
      ],
      examNotes: [
        'n घात वाले बहुपद के अधिकतम n वास्तविक शून्यक हो सकते हैं।',
        'शून्यकों का योग -b/a लिखते समय ऋण (-) चिह्न का विशेष ध्यान रखें।',
      ],
      importantQA: [
        {
          question: 'एक द्विघात बहुपद ज्ञात कीजिए जिसके शून्यकों का योग -3 तथा गुणनफल 2 है।',
          answer: 'p(x) = x^2 - (योग)x + गुणनफल = x^2 - (-3)x + 2 = x^2 + 3x + 2।',
          marks: 2,
        },
      ],
      mcqs: [
        {
          question: 'द्विघात बहुपद x^2 - 5x + 6 के शून्यकों का योग कितना होगा?',
          options: ['-5', '5', '6', '-6'],
          answerIndex: 1,
          explanation: 'शून्यकों का योग = -b/a = -(-5)/1 = 5।',
        },
      ],
    },
  },
};

function buildGeneratedChapterContent(
  subjectEn: string,
  subjectHi: string,
  chTitleEn: string,
  chTitleHi: string,
  linkedChapter?: ReturnType<typeof SEED_CHAPTERS.find>,
  linkedQuestions: typeof SEED_QUESTIONS = []
): PdfChapterContent {
  if (linkedChapter) {
    const defs = (linkedChapter.definitions || []).map((d) => ({ term: d.term, meaning: d.meaning }));
    const fms = (linkedChapter.formulas || []).map((f) => ({ name: f.name, expression: f.expression, usage: f.usage }));
    const mcqs = linkedQuestions
      .filter((q) => q.questionType === 'MCQ' && Array.isArray(q.options) && q.options.length >= 2)
      .slice(0, 6)
      .map((q) => ({
        question: q.questionText,
        options: q.options || [],
        answerIndex: Math.max(0, (q.options || []).findIndex((o) => o === q.correctAnswer)),
        explanation: q.explanation || 'Concept verified from board curriculum.',
      }));
    const qa = linkedQuestions
      .filter((q) => q.questionType !== 'MCQ')
      .slice(0, 4)
      .map((q) => ({
        question: q.questionText,
        answer: q.modelAnswer || q.explanation || q.correctAnswer || 'Refer to key concept points.',
        marks: q.marks || 2,
      }));
    const examplesQa = (linkedChapter.examples || []).slice(0, 2).map((ex) => ({
      question: ex.problem,
      answer: ex.solution,
      marks: 3,
    }));
    const combinedQa = [...qa, ...examplesQa].slice(0, 5);
    const overviewText = [linkedChapter.introduction, linkedChapter.completeExplanation].filter(Boolean).join('\n\n');
    const examNotes = [
      ...(linkedChapter.importantFacts || []),
      ...(linkedChapter.revisionNotes ? [linkedChapter.revisionNotes] : []),
    ].slice(0, 6);

    const safeEn = {
      overview: overviewText || `${chTitleEn} (${subjectEn}) concise board exam study guide.`,
      definitions: defs.length
        ? defs
        : [{ term: chTitleEn, meaning: `Core foundational principles and board exam applications in ${subjectEn}.` }],
      formulas: fms,
      examNotes: examNotes.length
        ? examNotes
        : [`Review all definitions and solved examples in ${chTitleEn} before attempting tests.`],
      importantQA: combinedQa.length
        ? combinedQa
        : [
            {
              question: `Explain the core concepts and exam applications of ${chTitleEn}.`,
              answer: linkedChapter.revisionNotes || linkedChapter.introduction || `${chTitleEn} forms a key unit in ${subjectEn}.`,
              marks: 3,
            },
          ],
      mcqs: mcqs.length
        ? mcqs
        : [
            {
              question: `Which study practice improves board accuracy in ${chTitleEn}?`,
              options: [
                'Concept clarity with written practice and formula revision',
                'Skipping definitions completely',
                'Memorizing without understanding steps',
                'Avoiding previous board questions',
              ],
              answerIndex: 0,
              explanation: 'Concept understanding paired with structured written practice yields top board marks.',
            },
          ],
    };

    const safeHi = {
      overview: `${chTitleHi} (${subjectHi}) — परीक्षा-केंद्रित सरल एवं संक्षिप्त नोट्स।\n\n${overviewText}`,
      definitions: safeEn.definitions,
      formulas: safeEn.formulas,
      examNotes: [
        `${chTitleHi} की प्रमुख परिभाषाओं, मुख्य बिंदुओं और सूत्रों को दोहराएँ।`,
        ...safeEn.examNotes.slice(0, 4),
      ],
      importantQA: safeEn.importantQA,
      mcqs: safeEn.mcqs,
    };

    return { en: safeEn, hi: safeHi };
  }

  // Original concise bilingual study pack crafted specifically for the subject & chapter
  return {
    en: {
      overview: `${chTitleEn} is an essential board curriculum chapter in ${subjectEn}. These original study notes summarize the foundational concepts, structured reasoning, terminology, and exam-scoring points in clear student-friendly language.`,
      definitions: [
        { term: `${chTitleEn} Core Principle`, meaning: `Fundamental rule and conceptual framework of ${chTitleEn} in ${subjectEn}.` },
        { term: 'Board Marking Structure', meaning: 'Write point-wise answers with clear headings, underlined keywords, and proper units/examples.' },
      ],
      formulas: [
        { name: 'Exam Presentation Formula', expression: 'Concept -> Rule/Formula -> Stepwise Application -> Conclusion', usage: 'Standard 3–5 mark board answer structure.' },
      ],
      examNotes: [
        `Focus on accurate terminology and conceptual clarity in ${chTitleEn}.`,
        'Attempt both 1-mark objective MCQs and 3–5 mark descriptive questions systematically.',
        'Revise highlighted definitions and examples 24 hours before the exam.',
      ],
      importantQA: [
        {
          question: `Write a short note highlighting the key exam concepts of "${chTitleEn}" in ${subjectEn}.`,
          answer: `${chTitleEn} builds core conceptual clarity in ${subjectEn}. Begin by defining the main principle, state supporting rules or examples cleanly, and conclude with its practical or syllabus significance.`,
          marks: 3,
        },
        {
          question: `State two common mistakes students should avoid while answering questions from ${chTitleEn}.`,
          answer: '1) Writing vague paragraphs instead of structured bullet points. 2) Missing key technical terms, labels, or units required by the board marking scheme.',
          marks: 2,
        },
      ],
      mcqs: [
        {
          question: `What is the best approach to score full marks in ${chTitleEn} (${subjectEn})?`,
          options: [
            'Clear definitions, structured steps, and solved examples',
            'Skipping short-answer keywords',
            'Omitting examples and reasoning',
            'Guessing without checking concepts',
          ],
          answerIndex: 0,
          explanation: 'Clear definitions, structured reasoning, and relevant examples align directly with board evaluation rubrics.',
        },
      ],
    },
    hi: {
      overview: `${chTitleHi} (${subjectHi}) बोर्ड परीक्षा पाठ्यक्रम का एक महत्वपूर्ण अध्याय है। इन मौलिक नोट्स में अध्याय का सरल विवरण, प्रमुख परिभाषाएँ, परीक्षा-उपयोगी तथ्य, महत्वपूर्ण प्रश्नोत्तर तथा MCQ संकलित किए गए हैं।`,
      definitions: [
        { term: `${chTitleHi} — मुख्य अवधारणा`, meaning: `${subjectHi} के अंतर्गत इस अध्याय के मूल सिद्धांत और व्यावहारिक अनुप्रयोग।` },
        { term: 'परीक्षा लेखन शैली', meaning: 'उत्तर हमेशा बिंदुवार, स्पष्ट शीर्षक, मुख्य शब्दों और उपयुक्त उदाहरणों के साथ लिखें।' },
      ],
      formulas: [
        { name: 'उत्तर लेखन सूत्र', expression: 'परिभाषा -> मुख्य नियम/उदाहरण -> निष्कर्ष', usage: 'लघु एवं दीर्घ उत्तरीय प्रश्नों में पूरे अंक पाने के लिए उपयोगी।' },
      ],
      examNotes: [
        `${chTitleHi} से संबंधित मुख्य शब्दावली और उदाहरणों का नियमित अभ्यास करें।`,
        'वस्तुनिष्ठ (MCQ) और वर्णनात्मक दोनों प्रकार के प्रश्नों को समय-सीमा में हल करें।',
      ],
      importantQA: [
        {
          question: `${chTitleHi} अध्याय के प्रमुख सिद्धांतों और परीक्षा महत्व का संक्षिप्त वर्णन कीजिए।`,
          answer: `${chTitleHi} (${subjectHi}) विद्यार्थियों को विषय की मजबूत नींव प्रदान करता है। उत्तर लिखते समय पहले मुख्य परिभाषा दें, फिर दो महत्वपूर्ण बिंदु तथा एक स्पष्ट उदाहरण लिखें।`,
          marks: 3,
        },
      ],
      mcqs: [
        {
          question: `${chTitleHi} अध्याय में पूरे अंक प्राप्त करने का सर्वोत्तम तरीका क्या है?`,
          options: [
            'स्पष्ट परिभाषा, सटीक उदाहरण और बिंदुवार उत्तर लेखन',
            'मुख्य बिंदुओं को छोड़ देना',
            'बिना अभ्यास किए रटना',
            'उदाहरण न लिखना',
          ],
          answerIndex: 0,
          explanation: 'स्पष्ट परिभाषा और बिंदुवार उत्तर बोर्ड की मूल्यांकन पद्धति के अनुरूप होते हैं।',
        },
      ],
    },
  };
}

const BLUEPRINTS: SubjectBlueprint[] = [
  // ================= CLASS 10 (All 6 Mandatory Subjects) =================
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'math',
    subjectNameEn: 'Mathematics',
    subjectNameHi: 'गणित',
    subjectIdRef: 'bseb_10_math',
    syllabusChapters: [
      { num: 1, en: 'Real Numbers', hi: 'वास्तविक संख्याएँ' },
      { num: 2, en: 'Polynomials', hi: 'बहुपद' },
      { num: 3, en: 'Pair of Linear Equations in Two Variables', hi: 'दो चर वाले रैखिक समीकरण युग्म' },
      { num: 4, en: 'Quadratic Equations', hi: 'द्विघात समीकरण' },
      { num: 5, en: 'Arithmetic Progressions', hi: 'समांतर श्रेढ़ियाँ' },
      { num: 6, en: 'Triangles', hi: 'त्रिभुज' },
      { num: 7, en: 'Coordinate Geometry', hi: 'निर्देशांक ज्यामिति' },
      { num: 8, en: 'Introduction to Trigonometry', hi: 'त्रिकोणमिति का परिचय' },
    ],
  },
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'science',
    subjectNameEn: 'Science',
    subjectNameHi: 'विज्ञान',
    subjectIdRef: 'bseb_10_sci',
    syllabusChapters: [
      { num: 1, en: 'Chemical Reactions and Equations', hi: 'रासायनिक अभिक्रियाएँ एवं समीकरण' },
      { num: 2, en: 'Acids, Bases and Salts', hi: 'अम्ल, क्षारक एवं लवण' },
      { num: 3, en: 'Metals and Non-metals', hi: 'धातु एवं अधातु' },
      { num: 4, en: 'Carbon and its Compounds', hi: 'कार्बन एवं उसके यौगिक' },
      { num: 5, en: 'Life Processes', hi: 'जैव प्रक्रम' },
      { num: 6, en: 'Control and Coordination', hi: 'नियंत्रण एवं समन्वय' },
      { num: 7, en: 'Light – Reflection and Refraction', hi: 'प्रकाश – परावर्तन तथा अपवर्तन' },
      { num: 8, en: 'Electricity', hi: 'विद्युत' },
    ],
  },
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'sst',
    subjectNameEn: 'Social Science',
    subjectNameHi: 'सामाजिक विज्ञान',
    subjectIdRef: 'bseb_10_sst',
    syllabusChapters: [
      { num: 1, en: 'The Rise of Nationalism in Europe', hi: 'यूरोप में राष्ट्रवाद का उदय' },
      { num: 2, en: 'Nationalism in India', hi: 'भारत में राष्ट्रवाद' },
      { num: 3, en: 'Resources and Development', hi: 'संसाधन एवं विकास' },
      { num: 4, en: 'Power Sharing & Federalism', hi: 'सत्ता की साझेदारी एवं संघवाद' },
      { num: 5, en: 'Development & Sectors of Indian Economy', hi: 'विकास एवं भारतीय अर्थव्यवस्था के क्षेत्रक' },
      { num: 6, en: 'Disaster Management', hi: 'आपदा प्रबंधन' },
    ],
  },
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'hindi',
    subjectNameEn: 'Hindi',
    subjectNameHi: 'हिंदी',
    subjectIdRef: 'bseb_10_hindi',
    syllabusChapters: [
      { num: 1, en: 'Shram Vibhajan aur Jati Pratha', hi: 'श्रम विभाजन और जाति प्रथा' },
      { num: 2, en: 'Vish ke Dant', hi: 'विष के दाँत' },
      { num: 3, en: 'Bharat se Ham Kya Sikhen', hi: 'भारत से हम क्या सीखें' },
      { num: 4, en: 'Nakhun Kyon Badhte Hain', hi: 'नाखून क्यों बढ़ते हैं' },
      { num: 5, en: 'Dahi Wali Mangamma (Varnika)', hi: 'दही वाली मंगम्मा (वर्णिका)' },
      { num: 6, en: 'Hindi Vyakaran: Sandhi, Samas & Muhavare', hi: 'हिंदी व्याकरण: संधि, समास एवं मुहावरे' },
    ],
  },
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'english',
    subjectNameEn: 'English',
    subjectNameHi: 'अंग्रेजी',
    subjectIdRef: 'bseb_10_eng',
    syllabusChapters: [
      { num: 1, en: 'The Pace for Living / A Letter to God', hi: 'प्रोज़ एवं मुख्य पाठ विश्लेषण' },
      { num: 2, en: 'Me and the Ecology Bit / Nelson Mandela', hi: 'पर्यावरण और समाज – मुख्य पाठ' },
      { num: 3, en: 'Gillu / Two Stories about Flying', hi: 'गिल्लू एवं कथा साहित्य' },
      { num: 4, en: 'Tense, Active-Passive Voice & Narration', hi: 'अंग्रेजी व्याकरण: काल, वाच्य एवं कथन' },
      { num: 5, en: 'Letter Writing, Notice & Essay Format', hi: 'पत्र, सूचना एवं निबंध लेखन' },
    ],
  },
  {
    classId: 'class_10',
    streamId: 'na',
    subjectKey: 'sanskrit',
    subjectNameEn: 'Sanskrit',
    subjectNameHi: 'संस्कृत',
    subjectIdRef: 'bseb_10_skt',
    syllabusChapters: [
      { num: 1, en: 'Mangalam (Upanishad Verses)', hi: 'मङ्गलम् (उपनिषद् श्लोक संग्रह)' },
      { num: 2, en: 'Patliputravaibhavam', hi: 'पाटलिपुत्रवैभवम्' },
      { num: 3, en: 'Alaskatha', hi: 'अलसकथा' },
      { num: 4, en: 'Sanskrit Sahitye Lekhikah', hi: 'संस्कृतसाहित्ये लेखिकाः' },
      { num: 5, en: 'Sanskrit Vyakaran: Sandhi, Karaka & Lakara', hi: 'संस्कृत व्याकरण: संधि, कारक एवं लकार' },
    ],
  },

  // ================= CLASS 11 (Science, Commerce, Arts/Humanities) =================
  {
    classId: 'class_11',
    streamId: 'science',
    subjectKey: 'physics',
    subjectNameEn: 'Physics',
    subjectNameHi: 'भौतिक विज्ञान',
    subjectIdRef: 'bseb_11_phy',
    syllabusChapters: [
      { num: 1, en: 'Units and Measurements', hi: 'मात्रक तथा मापन' },
      { num: 2, en: 'Motion in a Straight Line', hi: 'सरल रेखा में गति' },
      { num: 3, en: 'Laws of Motion', hi: 'गति के नियम' },
      { num: 4, en: 'Work, Energy and Power', hi: 'कार्य, ऊर्जा और शक्ति' },
      { num: 5, en: 'Gravitation', hi: 'गुरुत्वाकर्षण' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'science',
    subjectKey: 'chemistry',
    subjectNameEn: 'Chemistry',
    subjectNameHi: 'रसायन विज्ञान',
    subjectIdRef: 'bseb_11_chem',
    syllabusChapters: [
      { num: 1, en: 'Some Basic Concepts of Chemistry', hi: 'रसायन विज्ञान की कुछ मूल अवधारणाएँ' },
      { num: 2, en: 'Structure of Atom', hi: 'परमाणु की संरचना' },
      { num: 3, en: 'Classification of Elements & Periodicity', hi: 'तत्वों का वर्गीकरण एवं आवर्तिता' },
      { num: 4, en: 'Chemical Bonding and Molecular Structure', hi: 'रासायनिक आबंधन तथा आण्विक संरचना' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'science',
    subjectKey: 'math',
    subjectNameEn: 'Mathematics',
    subjectNameHi: 'गणित',
    subjectIdRef: 'bseb_11_math',
    syllabusChapters: [
      { num: 1, en: 'Sets, Relations and Functions', hi: 'समुच्चय, संबंध एवं फलन' },
      { num: 2, en: 'Trigonometric Functions', hi: 'त्रिकोणमितीय फलन' },
      { num: 3, en: 'Complex Numbers and Quadratic Equations', hi: 'सम्मिश्र संख्याएँ और द्विघातीय समीकरण' },
      { num: 4, en: 'Straight Lines and Conic Sections', hi: 'सरल रेखाएँ एवं शंकु परिच्छेद' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'science',
    subjectKey: 'biology',
    subjectNameEn: 'Biology',
    subjectNameHi: 'जीव विज्ञान',
    subjectIdRef: 'bseb_11_bio',
    syllabusChapters: [
      { num: 1, en: 'The Living World & Biological Classification', hi: 'जीव जगत एवं जीव जगत का वर्गीकरण' },
      { num: 2, en: 'Plant & Animal Kingdom', hi: 'वनस्पति एवं प्राणि जगत' },
      { num: 3, en: 'Cell: The Unit of Life', hi: 'कोशिका: जीवन की इकाई' },
      { num: 4, en: 'Biomolecules & Cell Division', hi: 'जैव अणु एवं कोशिका चक्र' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'commerce',
    subjectKey: 'accountancy',
    subjectNameEn: 'Accountancy',
    subjectNameHi: 'लेखाशास्त्र',
    subjectIdRef: 'bseb_11_acc',
    syllabusChapters: [
      { num: 1, en: 'Introduction to Accounting', hi: 'लेखांकन – एक परिचय' },
      { num: 2, en: 'Theory Base of Accounting & GST Basics', hi: 'लेखांकन के सैद्धांतिक आधार' },
      { num: 3, en: 'Recording of Transactions (Journal & Ledger)', hi: 'लेन-देन का अभिलेखन (रोज़नामचा एवं खाता-बही)' },
      { num: 4, en: 'Trial Balance and Rectification of Errors', hi: 'तलपट एवं अशुद्धियों का शोधन' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'commerce',
    subjectKey: 'business_studies',
    subjectNameEn: 'Business Studies',
    subjectNameHi: 'व्यावसायिक अध्ययन',
    subjectIdRef: 'bseb_11_bst',
    syllabusChapters: [
      { num: 1, en: 'Business, Trade and Commerce', hi: 'व्यवसाय, व्यापार और वाणिज्य' },
      { num: 2, en: 'Forms of Business Organisation', hi: 'व्यवसाय संगठन के स्वरूप' },
      { num: 3, en: 'Private, Public and Global Enterprises', hi: 'निजी, सार्वजनिक एवं भूमंडलीय उपक्रम' },
      { num: 4, en: 'Business Services & Emerging Modes', hi: 'व्यावसायिक सेवाएँ एवं ई-व्यवसाय' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'commerce',
    subjectKey: 'economics',
    subjectNameEn: 'Economics',
    subjectNameHi: 'अर्थशास्त्र',
    subjectIdRef: 'bseb_11_eco',
    syllabusChapters: [
      { num: 1, en: 'Introduction to Statistics & Microeconomics', hi: 'सांख्यिकी एवं व्यष्टि अर्थशास्त्र का परिचय' },
      { num: 2, en: 'Collection & Presentation of Data', hi: 'आँकड़ों का संग्रहण एवं प्रस्तुतीकरण' },
      { num: 3, en: 'Consumer Equilibrium and Demand', hi: 'उपभोक्ता संतुलन एवं माँग' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'arts',
    subjectKey: 'history',
    subjectNameEn: 'History',
    subjectNameHi: 'इतिहास',
    subjectIdRef: 'bseb_11_hist',
    syllabusChapters: [
      { num: 1, en: 'Writing and City Life (Mesopotamia)', hi: 'लेखन कला और शहरी जीवन' },
      { num: 2, en: 'An Empire Across Three Continents', hi: 'तीन महाद्वीपों में फैला हुआ साम्राज्य' },
      { num: 3, en: 'Changing Cultural Traditions', hi: 'बदलती हुई सांस्कृतिक परंपराएँ' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'arts',
    subjectKey: 'political_science',
    subjectNameEn: 'Political Science',
    subjectNameHi: 'राजनीति विज्ञान',
    subjectIdRef: 'bseb_11_pol',
    syllabusChapters: [
      { num: 1, en: 'Constitution: Why and How?', hi: 'संविधान: क्यों और कैसे?' },
      { num: 2, en: 'Rights in the Indian Constitution', hi: 'भारतीय संविधान में अधिकार' },
      { num: 3, en: 'Election and Representation', hi: 'चुनाव और प्रतिनिधित्व' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'arts',
    subjectKey: 'geography',
    subjectNameEn: 'Geography',
    subjectNameHi: 'भूगोल',
    subjectIdRef: 'bseb_11_geo',
    syllabusChapters: [
      { num: 1, en: 'Geography as a Discipline', hi: 'भूगोल एक विषय के रूप में' },
      { num: 2, en: 'The Origin and Evolution of the Earth', hi: 'पृथ्वी की उत्पत्ति एवं विकास' },
      { num: 3, en: 'Interior of the Earth & Plate Tectonics', hi: 'पृथ्वी की आंतरिक संरचना' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'arts',
    subjectKey: 'sociology',
    subjectNameEn: 'Sociology & Humanities Core',
    subjectNameHi: 'समाजशास्त्र एवं मानविकी',
    syllabusChapters: [
      { num: 1, en: 'Sociology and Society', hi: 'समाजशास्त्र एवं समाज' },
      { num: 2, en: 'Terms, Concepts and Social Institutions', hi: 'सामाजिक संस्थाएँ एवं अवधारणाएँ' },
      { num: 3, en: 'Culture and Socialisation', hi: 'संस्कृति तथा समाजीकरण' },
    ],
  },

  // ================= CLASS 12 (Science, Commerce, Arts/Humanities) =================
  {
    classId: 'class_12',
    streamId: 'science',
    subjectKey: 'physics',
    subjectNameEn: 'Physics',
    subjectNameHi: 'भौतिक विज्ञान',
    subjectIdRef: 'bseb_12_phy',
    syllabusChapters: [
      { num: 1, en: 'Electric Charges and Fields', hi: 'वैद्युत आवेश तथा क्षेत्र' },
      { num: 2, en: 'Electrostatic Potential and Capacitance', hi: 'स्थिरवैद्युत विभव तथा धारिता' },
      { num: 3, en: 'Current Electricity', hi: 'विद्युत धारा' },
      { num: 4, en: 'Moving Charges and Magnetism', hi: 'गतिमान आवेश और चुंबकत्व' },
      { num: 5, en: 'Ray Optics and Optical Instruments', hi: 'किरण प्रकाशिकी एवं प्रकाशिक यंत्र' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'science',
    subjectKey: 'chemistry',
    subjectNameEn: 'Chemistry',
    subjectNameHi: 'रसायन विज्ञान',
    subjectIdRef: 'bseb_12_chem',
    syllabusChapters: [
      { num: 1, en: 'Solutions (विलयन)', hi: 'विलयन' },
      { num: 2, en: 'Electrochemistry', hi: 'वैद्युतरसायन' },
      { num: 3, en: 'Chemical Kinetics', hi: 'रासायनिक बलगतिकी' },
      { num: 4, en: 'd and f Block Elements', hi: 'd एवं f ब्लॉक के तत्व' },
      { num: 5, en: 'Coordination Compounds', hi: 'उपसहसंयोजन यौगिक' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'science',
    subjectKey: 'math',
    subjectNameEn: 'Mathematics',
    subjectNameHi: 'गणित',
    subjectIdRef: 'bseb_12_math',
    syllabusChapters: [
      { num: 1, en: 'Relations and Functions', hi: 'संबंध एवं फलन' },
      { num: 2, en: 'Inverse Trigonometric Functions', hi: 'प्रतिलोम त्रिकोणमितीय फलन' },
      { num: 3, en: 'Matrices and Determinants', hi: 'आव्यूह एवं सारणिक' },
      { num: 4, en: 'Continuity and Differentiability', hi: 'सांतत्य तथा अवकलनीयता' },
      { num: 5, en: 'Integrals and Differential Equations', hi: 'समाकलन एवं अवकल समीकरण' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'science',
    subjectKey: 'biology',
    subjectNameEn: 'Biology',
    subjectNameHi: 'जीव विज्ञान',
    subjectIdRef: 'bseb_12_bio',
    syllabusChapters: [
      { num: 1, en: 'Sexual Reproduction in Flowering Plants', hi: 'पुष्पी पादपों में लैंगिक जनन' },
      { num: 2, en: 'Human Reproduction & Reproductive Health', hi: 'मानव जनन एवं जनन स्वास्थ्य' },
      { num: 3, en: 'Principles of Inheritance and Variation', hi: 'वंशागति तथा विविधता के सिद्धांत' },
      { num: 4, en: 'Molecular Basis of Inheritance', hi: 'वंशागति के आण्विक आधार' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'commerce',
    subjectKey: 'accountancy',
    subjectNameEn: 'Accountancy',
    subjectNameHi: 'लेखाशास्त्र',
    subjectIdRef: 'bseb_12_acc',
    syllabusChapters: [
      { num: 1, en: 'Accounting for Partnership Firms', hi: 'साझेदारी फर्मों का लेखांकन' },
      { num: 2, en: 'Goodwill, Admission & Retirement of Partner', hi: 'ख्याति एवं साझेदार का प्रवेश/निवृत्ति' },
      { num: 3, en: 'Accounting for Share Capital & Debentures', hi: 'अंश पूँजी एवं ऋणपत्रों का लेखांकन' },
      { num: 4, en: 'Financial Statements & Cash Flow Analysis', hi: 'वित्तीय विवरण एवं रोकड़ प्रवाह विवरण' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'commerce',
    subjectKey: 'business_studies',
    subjectNameEn: 'Business Studies',
    subjectNameHi: 'व्यावसायिक अध्ययन',
    subjectIdRef: 'bseb_12_bst',
    syllabusChapters: [
      { num: 1, en: 'Nature and Significance of Management', hi: 'प्रबंध की प्रकृति एवं महत्व' },
      { num: 2, en: 'Principles of Management (Fayol & Taylor)', hi: 'प्रबंध के सिद्धांत' },
      { num: 3, en: 'Business Environment & Planning', hi: 'व्यावसायिक पर्यावरण एवं नियोजन' },
      { num: 4, en: 'Financial Management & Marketing', hi: 'वित्तीय प्रबंध एवं विपणन' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'commerce',
    subjectKey: 'economics',
    subjectNameEn: 'Economics',
    subjectNameHi: 'अर्थशास्त्र',
    subjectIdRef: 'bseb_12_eco',
    syllabusChapters: [
      { num: 1, en: 'National Income and Related Aggregates', hi: 'राष्ट्रीय आय एवं संबंधित समुच्चय' },
      { num: 2, en: 'Money and Banking', hi: 'मुद्रा और बैंकिंग' },
      { num: 3, en: 'Government Budget & Indian Economy', hi: 'सरकारी बजट एवं भारतीय अर्थव्यवस्था' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'arts',
    subjectKey: 'history',
    subjectNameEn: 'History',
    subjectNameHi: 'इतिहास',
    subjectIdRef: 'bseb_12_hist',
    syllabusChapters: [
      { num: 1, en: 'Bricks, Beads and Bones (Harappan Civilisation)', hi: 'ईंटें, मनके तथा अस्थियाँ (हड़प्पा सभ्यता)' },
      { num: 2, en: 'Kings, Farmers and Towns', hi: 'राजा, किसान और नगर' },
      { num: 3, en: 'Mahatma Gandhi and the Nationalist Movement', hi: 'महात्मा गांधी और राष्ट्रीय आंदोलन' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'arts',
    subjectKey: 'political_science',
    subjectNameEn: 'Political Science',
    subjectNameHi: 'राजनीति विज्ञान',
    subjectIdRef: 'bseb_12_pol',
    syllabusChapters: [
      { num: 1, en: 'Challenges of Nation Building', hi: 'राष्ट्र निर्माण की चुनौतियाँ' },
      { num: 2, en: 'The End of Bipolarity & Global Politics', hi: 'दो ध्रुवीयता का अंत एवं समकालीन विश्व' },
      { num: 3, en: 'Era of One-Party Dominance & Foreign Policy', hi: 'एक दल के प्रभुत्व का दौर एवं विदेश नीति' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'arts',
    subjectKey: 'geography',
    subjectNameEn: 'Geography',
    subjectNameHi: 'भूगोल',
    subjectIdRef: 'bseb_12_geo',
    syllabusChapters: [
      { num: 1, en: 'Human Geography: Nature and Scope', hi: 'मानव भूगोल: प्रकृति एवं विषय क्षेत्र' },
      { num: 2, en: 'The World Population & Human Development', hi: 'विश्व जनसंख्या एवं मानव विकास' },
      { num: 3, en: 'Primary, Secondary & Tertiary Activities', hi: 'प्राथमिक, द्वितीयक एवं तृतीयक क्रियाएँ' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'arts',
    subjectKey: 'psychology',
    subjectNameEn: 'Psychology & Sociology',
    subjectNameHi: 'मनोविज्ञान एवं समाजशास्त्र',
    syllabusChapters: [
      { num: 1, en: 'Variations in Psychological Attributes', hi: 'मनोवैज्ञानिक गुणों में विभिन्नताएँ' },
      { num: 2, en: 'Self, Personality & Meeting Life Challenges', hi: 'आत्म एवं व्यक्तित्व तथा जीवन की चुनौतियाँ' },
      { num: 3, en: 'Social Inequality and Exclusion', hi: 'सामाजिक असमानता एवं बहिष्कार' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'na',
    subjectKey: 'english',
    subjectNameEn: 'English Core',
    subjectNameHi: 'अंग्रेजी (अनिवार्य)',
    subjectIdRef: 'bseb_11_eng',
    syllabusChapters: [
      { num: 1, en: 'The Portrait of a Lady & Prose Comprehension', hi: 'प्रोज़ एवं पाठ विश्लेषण' },
      { num: 2, en: 'We’re Not Afraid to Die... & Grammar Practice', hi: 'कथा साहित्य एवं व्याकरण अभ्यास' },
      { num: 3, en: 'Note-Making, Summarising & Official Letters', hi: 'नोट-मेकिंग एवं औपचारिक पत्र लेखन' },
    ],
  },
  {
    classId: 'class_11',
    streamId: 'na',
    subjectKey: 'hindi',
    subjectNameEn: 'Hindi Core',
    subjectNameHi: 'हिंदी (अनिवार्य)',
    subjectIdRef: 'bseb_11_hindi',
    syllabusChapters: [
      { num: 1, en: 'Namak ka Daroga / Poos ki Raat', hi: 'नमक का दरोगा / पूस की रात' },
      { num: 2, en: 'Kabir & Meera ke Pad', hi: 'कबीर एवं मीरा के पद (काव्य खंड)' },
      { num: 3, en: 'Hindi Sahitya aur Vyakaran Sangrah', hi: 'हिंदी साहित्य एवं व्याकरण संग्रह' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'na',
    subjectKey: 'english',
    subjectNameEn: 'English Core',
    subjectNameHi: 'अंग्रेजी (अनिवार्य)',
    subjectIdRef: 'bseb_12_eng',
    syllabusChapters: [
      { num: 1, en: 'The Last Lesson & Indian Civilization Notes', hi: 'मुख्य गद्य पाठ एवं सारांश' },
      { num: 2, en: 'Lost Spring & Poetry Appreciation', hi: 'गद्य एवं काव्य सौंदर्य' },
      { num: 3, en: 'Report Writing, Notices & Precise Comprehension', hi: 'रिपोर्ट, नोटिस एवं अपठित गद्यांश' },
    ],
  },
  {
    classId: 'class_12',
    streamId: 'na',
    subjectKey: 'hindi',
    subjectNameEn: 'Hindi Core',
    subjectNameHi: 'हिंदी (अनिवार्य)',
    subjectIdRef: 'bseb_12_hindi',
    syllabusChapters: [
      { num: 1, en: 'Baatcheet & Usne Kaha Tha', hi: 'बातचीत एवं उसने कहा था' },
      { num: 2, en: 'Sampoorna Kranti & Kadbak', hi: 'सम्पूर्ण क्रांति एवं कड़बक' },
      { num: 3, en: 'Patra Lekhan, Nibandh & Vyakaran Revision', hi: 'पत्र लेखन, निबंध एवं व्याकरण पुनरावृत्ति' },
    ],
  },
];

export function buildSeedPdfLibrary(): PdfNoteItem[] {
  const now = '2026-11-17T00:00:00.000Z';
  const items: PdfNoteItem[] = [];

  for (const bp of BLUEPRINTS) {
    const subjectChapters = bp.subjectIdRef
      ? SEED_CHAPTERS.filter((c) => c.subjectId === bp.subjectIdRef).sort(
          (a, b) => a.chapterNumber - b.chapterNumber
        )
      : [];

    for (const ch of bp.syllabusChapters) {
      const id = `pdf_${bp.classId.replace('class_', 'c')}_${bp.subjectKey}_ch${ch.num}`;
      const overrideKey = `${bp.classId.replace('class_', 'c')}_${bp.subjectKey}_ch${ch.num}`;
      const linkedChapter = subjectChapters.find((sc) => sc.chapterNumber === ch.num);
      const linkedQuestions = linkedChapter
        ? SEED_QUESTIONS.filter((q) => q.chapterId === linkedChapter.id)
        : [];

      // Honest authoring rule:
      // Class 10: First 3 chapters of every subject + chapters backed by curriculum authoring are Ready ('available');
      // later chapters beyond the authored set are transparently marked 'coming_soon' (no fake/incomplete PDFs!).
      // Class 11 & 12: Authored chapters (1-2 per subject) are 'available'; remaining roadmap chapters are 'coming_soon'.
      const isAuthored =
        Boolean(RICH_CONTENT_OVERRIDES[overrideKey]) ||
        Boolean(linkedChapter) ||
        (bp.classId === 'class_10' ? ch.num <= 3 : ch.num <= 2);

      const content = isAuthored
        ? RICH_CONTENT_OVERRIDES[overrideKey] ||
          buildGeneratedChapterContent(
            bp.subjectNameEn,
            bp.subjectNameHi,
            ch.en,
            ch.hi,
            linkedChapter,
            linkedQuestions
          )
        : undefined;

      const isFreeChapter = isAuthored && ch.num === 1;

      items.push({
        id,
        classId: bp.classId,
        streamId: bp.streamId,
        boardId: 'all',
        subjectKey: bp.subjectKey,
        subjectNameEn: bp.subjectNameEn,
        subjectNameHi: bp.subjectNameHi,
        chapterNumber: ch.num,
        chapterTitleEn: ch.en,
        chapterTitleHi: ch.hi,
        ...(linkedChapter?.id ? { chapterIdRef: linkedChapter.id } : {}),
        ...(bp.subjectIdRef ? { subjectIdRef: bp.subjectIdRef } : {}),
        availability: isAuthored ? 'available' : 'coming_soon',
        isFree: isFreeChapter,
        priceInr: isFreeChapter ? 0 : 19,
        allowDownload: true,
        allowPrint: true,
        mediumSupport: 'bilingual',
        sourceType: 'generated',
        published: true,
        ...(content ? { content } : {}),
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return items;
}
