import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Archive, ShieldAlert, Bookmark, Sparkles } from 'lucide-react';
import { CurriculumStatus, PriorityLevel } from '../types/index.ts';

export const CurriculumStatusText: React.FC<{ status: CurriculumStatus }> = ({ status }) => {
  if (status === 'Verified Official') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        Verified Official
      </span>
    );
  }
  if (status === 'Under Review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Reference Blueprint · Under Review
      </span>
    );
  }
  if (status === 'Archived') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
        <Archive className="w-3.5 h-3.5 shrink-0" />
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      Unverified
    </span>
  );
};

export const PriorityText: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  if (priority === 'RED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        RED · Very Important
      </span>
    );
  }
  if (priority === 'YELLOW') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Bookmark className="w-3.5 h-3.5 shrink-0" />
        YELLOW · Important
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
      GREEN · Additional Practice
    </span>
  );
};
