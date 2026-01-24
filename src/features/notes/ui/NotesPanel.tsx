import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';

export function NotesPanel() {
  const activeNoteId = useSelector(
    (state: RootState) => state.notes.activeNoteId
  );

  return (
    <div className="flex h-full flex-col p-4 bg-background/30 backdrop-blur-sm">
      {activeNoteId ? <NoteEditor key={activeNoteId} /> : <NoteList />}
    </div>
  );
}
