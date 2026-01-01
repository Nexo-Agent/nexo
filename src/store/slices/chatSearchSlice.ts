import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChatItem } from '@/ui/ChatSidebar';

interface ChatSearchState {
  searchOpen: boolean;
  searchQuery: string;
  filteredChats: ChatItem[];
}

const initialState: ChatSearchState = {
  searchOpen: false,
  searchQuery: '',
  filteredChats: [],
};

const chatSearchSlice = createSlice({
  name: 'chatSearch',
  initialState,
  reducers: {
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
      if (!action.payload) {
        // Reset search when closing
        state.searchQuery = '';
        state.filteredChats = [];
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilteredChats: (state, action: PayloadAction<ChatItem[]>) => {
      state.filteredChats = action.payload;
    },
  },
});

export const { setSearchOpen, setSearchQuery, setFilteredChats } =
  chatSearchSlice.actions;
export default chatSearchSlice.reducer;
