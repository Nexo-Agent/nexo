import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: number; // Matches Rust snake_case
  created_at: number; // Matches Rust snake_case
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  isLoading: boolean;
}

const initialState: NotesState = {
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  isLoading: false,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setNotes: (state, action: PayloadAction<Note[]>) => {
      state.notes = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addNoteLocally: (state, action: PayloadAction<Note>) => {
      state.notes.unshift(action.payload);
      state.activeNoteId = action.payload.id;
    },
    updateNoteLocally: (
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        content?: string;
        updated_at: number;
      }>
    ) => {
      const { id, title, content, updated_at } = action.payload;
      const note = state.notes.find((n) => n.id === id);
      if (note) {
        if (title !== undefined) note.title = title;
        if (content !== undefined) note.content = content;
        note.updated_at = updated_at;
      }
    },
    deleteNoteLocally: (state, action: PayloadAction<string>) => {
      state.notes = state.notes.filter((n) => n.id !== action.payload);
      if (state.activeNoteId === action.payload) {
        state.activeNoteId = null;
      }
    },
    setActiveNote: (state, action: PayloadAction<string | null>) => {
      state.activeNoteId = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  setNotes,
  setLoading,
  addNoteLocally,
  updateNoteLocally,
  deleteNoteLocally,
  setActiveNote,
  setSearchQuery,
} = notesSlice.actions;

export const notesReducer = notesSlice.reducer;
