import { AppDispatch, RootState } from '@/app/store';
import { invokeCommand } from '@/lib/tauri';
import {
  setNotes,
  setLoading,
  addNoteLocally,
  updateNoteLocally,
  deleteNoteLocally,
  Note,
} from './notesSlice';

export const loadNotes = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const notes = await invokeCommand<Note[]>('get_notes');
    dispatch(setNotes(notes));
  } catch (error) {
    console.error('Failed to load notes:', error);
    dispatch(setLoading(false));
  }
};

export const createNote = (title?: string) => async (dispatch: AppDispatch) => {
  const newNote: Note = {
    id: crypto.randomUUID(),
    title: title || 'New Note',
    content: '',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  try {
    await invokeCommand('create_note', { note: newNote });
    dispatch(addNoteLocally(newNote));
  } catch (error) {
    console.error('Failed to create note:', error);
  }
};

export const updateNote =
  (id: string, title?: string, content?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const note = state.notes.notes.find((n) => n.id === id);
    if (!note) return;

    const updated_at = Date.now();
    const updatedTitle = title ?? note.title;
    const updatedContent = content ?? note.content;

    try {
      // Optimistic update locally
      dispatch(updateNoteLocally({ id, title, content, updated_at }));

      await invokeCommand('update_note', {
        id,
        title: updatedTitle,
        content: updatedContent,
        updatedAt: updated_at,
      });
    } catch (error) {
      console.error('Failed to update note:', error);
      // Fallback or refresh might be needed here
    }
  };

export const deleteNote = (id: string) => async (dispatch: AppDispatch) => {
  try {
    await invokeCommand('delete_note', { id });
    dispatch(deleteNoteLocally(id));
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
};
