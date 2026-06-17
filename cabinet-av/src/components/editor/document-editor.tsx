'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Mark, mergeAttributes } from '@tiptap/core';
import { Bold, Italic, Strikethrough, List, ListOrdered, Undo, Redo, CheckCircle, X, Edit3 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Custom Mark: needs-confirmation
const NeedsConfirmation = Mark.create({
  name: 'needsConfirmation',
  priority: 1000,

  addAttributes() {
    return {
      reason: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-reason'),
        renderHTML: (attrs) => ({ 'data-reason': attrs.reason }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-reason]' },
      { tag: 'span.needs-confirmation' },
      { tag: 'span[title]', getAttrs: (el) => ({ reason: (el as HTMLElement).getAttribute('title') }) },
      {
        tag: 'span[style]',
        getAttrs: (el) => {
          const style = (el as HTMLElement).getAttribute('style') || '';
          if (/background[^;]*#fff/i.test(style) || /background[^;]*yellow/i.test(style)) {
            return { reason: (el as HTMLElement).getAttribute('title') || 'Necesită verificare' };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'needs-confirmation' }), 0];
  },
});

interface PopoverState {
  visible: boolean;
  x: number;
  y: number;
  reason: string;
  originalText: string;
  editValue: string;
  element: HTMLElement | null;
}

interface DocumentEditorProps {
  initialContent: string;
  documentId?: string;
}

export function DocumentEditor({ initialContent, documentId }: DocumentEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    x: 0,
    y: 0,
    reason: '',
    originalText: '',
    editValue: '',
    element: null,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      NeedsConfirmation,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Începeți redactarea documentului...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[800px] bg-white dark:bg-slate-950 p-12 shadow-sm rounded-lg mx-auto w-full max-w-[850px]',
      },
    },
  });

  // Click delegation for needs-confirmation spans
  const handleEditorClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.needs-confirmation, [data-reason]') as HTMLElement | null;
      if (!target) {
        setPopover((prev) => ({ ...prev, visible: false }));
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = target.getBoundingClientRect();
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      if (!wrapperRect) return;

      setPopover({
        visible: true,
        x: rect.left - wrapperRect.left,
        y: rect.bottom - wrapperRect.top + 8,
        reason: target.getAttribute('data-reason') || 'Valoare necesită verificare',
        originalText: target.textContent || '',
        editValue: target.textContent || '',
        element: target,
      });
    },
    []
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.addEventListener('click', handleEditorClick);
    return () => wrapper.removeEventListener('click', handleEditorClick);
  }, [handleEditorClick]);

  const confirmSpan = useCallback(() => {
    if (!popover.element || !editor) return;

    // Replace span with confirmed text (green flash then plain)
    const el = popover.element;
    const newText = popover.editValue || popover.originalText;

    el.classList.remove('needs-confirmation');
    el.classList.add('confirmed-zone');
    el.textContent = newText;

    setTimeout(() => {
      el.classList.remove('confirmed-zone');
      el.removeAttribute('data-reason');
      el.className = '';
    }, 1500);

    setPopover((prev) => ({ ...prev, visible: false }));
    toast.success('Valoare confirmată');
  }, [popover, editor]);

  const removeSpan = useCallback(() => {
    if (!popover.element) return;
    const el = popover.element;
    const text = document.createTextNode(el.textContent || '');
    el.replaceWith(text);
    setPopover((prev) => ({ ...prev, visible: false }));
    toast.info('Marcaj eliminat');
  }, [popover]);

  const handleSave = async () => {
    if (!editor || !documentId) return;
    setSaving(true);
    try {
      const html = editor.getHTML();
      await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: documentId, htmlContent: html, textContent: editor.getText() }),
      });
      toast.success('Document salvat');
    } catch {
      toast.error('Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  if (!editor) return null;

  return (
    <div ref={wrapperRef} className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white p-2 px-4 dark:border-slate-800 dark:bg-slate-950 justify-between">
        <div className="flex items-center gap-1">
          <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        {documentId && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Se salvează...' : 'Salvează'}
          </Button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-8 dark:bg-slate-900">
        <EditorContent editor={editor} />
      </div>

      {/* Confirmation Popover */}
      {popover.visible && (
        <>
          {/* Backdrop (click outside closes) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPopover((p) => ({ ...p, visible: false }))}
          />
          <div
            className="absolute z-50 w-80 rounded-xl border border-amber-200 bg-white p-4 shadow-xl dark:border-amber-800 dark:bg-slate-900"
            style={{ left: Math.max(0, popover.x), top: popover.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <span className="text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI nu e sigur:</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{popover.reason}</p>
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Valoare actuală:</label>
              <Input
                value={popover.editValue}
                onChange={(e) => setPopover((p) => ({ ...p, editValue: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={confirmSpan} className="flex-1 h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="h-3.5 w-3.5" /> Confirmă
              </Button>
              <Button size="sm" variant="outline" onClick={removeSpan} className="h-8 gap-1.5 text-slate-600">
                <X className="h-3.5 w-3.5" /> Elimină
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
