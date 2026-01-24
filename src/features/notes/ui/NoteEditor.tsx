import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft } from 'lucide-react';
import { AppDispatch, RootState } from '@/app/store';
import { setActiveNote } from '../state/notesSlice';
import { updateNote } from '../state/notesActions';
import { Textarea } from '@/ui/atoms/textarea';
import { Input } from '@/ui/atoms/input';
import { ScrollArea } from '@/ui/atoms/scroll-area';

export function NoteEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const activeNoteId = useSelector(
    (state: RootState) => state.notes.activeNoteId
  );
  const note = useSelector((state: RootState) =>
    state.notes.notes.find((n) => n.id === activeNoteId)
  );

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');

  if (!note) return null;

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    dispatch(updateNote(note.id, newTitle, content));
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    dispatch(updateNote(note.id, title, newContent));
  };

  return (
    <div className="animate-in slide-in-from-right flex h-full flex-col overflow-hidden duration-300">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => dispatch(setActiveNote(null))}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to list
        </button>
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-muted-foreground/50">
          <span className="size-1.5 rounded-full bg-success/50" />
          Autosaved
        </div>
      </div>

      <ScrollArea className="-mx-2 flex-1 px-2">
        <div className="flex flex-col gap-4">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Title"
            className="border-none bg-transparent p-0 text-lg font-bold shadow-none ring-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
          />
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[300px] flex-1 resize-none border-none bg-transparent p-0 text-sm shadow-none ring-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
          />
        </div>
      </ScrollArea>
    </div>
  );
}
