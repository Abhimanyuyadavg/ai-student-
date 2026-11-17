import React, { useState } from 'react';
import { Download, Eye, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { APP_ASSETS } from '../lib/assets.ts';
import { CurriculumStatusText } from '../components/StatusText.tsx';
import { AuthImage, ZoomableAuthThumbnail } from '../components/ImageTools.tsx';
import { LearningMaterial } from '../types/index.ts';

export const LibraryPage: React.FC = () => {
  const { materials, subjects, boards } = useApp();
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewerItem, setViewerItem] = useState<LearningMaterial | null>(null);

  const categories = [
    'all',
    'Textbook Notes',
    'Chapter Summary',
    'Formula Sheet',
    'Important Questions',
    'Model Paper',
    'Previous Year Paper',
    'Practice Worksheet',
    'Diagram',
    'Revision PDF',
    'Official Syllabus',
  ];

  const filtered = materials.filter((m) => {
    if (!m.published) return false;
    if (category !== 'all' && m.materialType !== category) return false;
    if (search.trim() && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDownloadText = (mat: LearningMaterial) => {
    const blob = new Blob(
      [
        `${mat.title}\nType: ${mat.materialType}\nVerification: ${mat.verificationStatus}\nSource: ${
          mat.sourceCitation || 'AI STUDENTS Study Library'
        }\n\n${mat.content}\n`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mat.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Library Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-center space-y-2">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            Notes, Formula Digests &amp; Syllabus Archive
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Study Material Library
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
            Access curated formula sheets, chapter summaries, worksheets, and verified official syllabus documents. Copyrighted textbooks are never reproduced without permission.
          </p>
        </div>
        <div className="md:col-span-4 min-h-[160px]">
          <img
            src={APP_ASSETS.studyLibraryShelf}
            alt="Study reference books and geometric notes on an oak bookshelf"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, formula sheets, model papers..."
            className="w-full pl-9 pr-3 py-2 text-sm min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-sm leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
          No study materials matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mat) => {
            const subj = subjects.find((s) => s.id === mat.subjectId);
            const board = boards.find((b) => b.id === mat.boardId);
            return (
              <div
                key={mat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  {mat.imageUrl && (
                    <div className="h-36 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <AuthImage
                        src={mat.imageUrl}
                        alt={mat.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{mat.materialType}</span>
                    <CurriculumStatusText status={mat.verificationStatus} />
                  </div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {mat.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {board?.boardCode} · {subj?.subjectName || 'Subject'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setViewerItem(mat)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read</span>
                  </button>
                  <button
                    onClick={() => handleDownloadText(mat)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Material Reader Modal */}
      {viewerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">{viewerItem.materialType}</p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {viewerItem.title}
                </h3>
              </div>
              <button
                onClick={() => setViewerItem(null)}
                aria-label="Close reader"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <CurriculumStatusText status={viewerItem.verificationStatus} />
              {viewerItem.imageUrl && (
                <ZoomableAuthThumbnail
                  src={viewerItem.imageUrl}
                  alt={viewerItem.title}
                  title={viewerItem.title}
                  className="w-full max-h-72 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              )}
              <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {viewerItem.content}
              </pre>
              {viewerItem.fileUrl && (
                <a
                  href={viewerItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-semibold text-indigo-700 dark:text-indigo-400 underline"
                >
                  Open Attached Source Document
                </a>
              )}
              {viewerItem.sourceCitation && (
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Source Citation: {viewerItem.sourceCitation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
