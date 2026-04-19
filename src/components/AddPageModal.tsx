import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, List } from 'lucide-react';

interface AddPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'summary' | 'lecture' | 'practice') => void;
}

export const AddPageModal: React.FC<AddPageModalProps> = React.memo(({ isOpen, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-50">הוסף דף חדש</h2>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => onSelect('summary')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors"
              >
                <FileText className="w-6 h-6 text-cyan-600" />
                <span className="font-medium text-zinc-100">סיכום</span>
              </button>
              <button
                onClick={() => onSelect('lecture')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors"
              >
                <List className="w-6 h-6 text-cyan-600" />
                <span className="font-medium text-zinc-100">הרצאה</span>
              </button>
              <button
                onClick={() => onSelect('practice')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors"
              >
                <List className="w-6 h-6 text-cyan-600" />
                <span className="font-medium text-zinc-100">תרגול</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
