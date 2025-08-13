import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {RootState} from '../store';
import {
  Post,
  PostS,
  ReqSearch,
  ReqSearchUser,
  ResSearchPost,
  ResSearchUser,
  SearchState,
} from './searchType';
import axiosInstance from '../axiosInstance';
import {API} from '../api';

const initialState: SearchState = {
  posts: undefined,
  users: undefined,
  isLoading: false,
  isError: false,
  errorMessage: undefined,
};

export const fetchSearchPost = createAsyncThunk<
  ResSearchPost,
  ReqSearch,
  {rejectValue: {message: string}}
>(
  'search/fetchPosts',
  async ({refreshToken, keyword}, {rejectWithValue, signal}) => {
    try {
      const res = await axiosInstance.post(
        API.POST_SEARCH_POST,
        {keyword},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
          signal, // Add abort signal for cleanup
        },
      );
      return res.data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return rejectWithValue({message: 'Search cancelled'});
      }
      return rejectWithValue({
        message: error?.response?.data?.message || 'Tìm kiếm thất bại.',
      });
    }
  },
);

export const fetchSearchUser = createAsyncThunk<
  ResSearchUser,
  ReqSearchUser,
  {rejectValue: {message: string}}
>(
  'search/fetchUsers',
  async ({refreshToken, keyword, mode}, {rejectWithValue, signal}) => {
    try {
      const res = await axiosInstance.post(
        API.POST_SEARCH_USER,
        {
          keyword,
          mode,
        },
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
          signal, // Add abort signal for cleanup
        },
      );
      return res.data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return rejectWithValue({message: 'Search cancelled'});
      }
      return rejectWithValue({
        message: error?.response?.data?.message || 'Tìm kiếm thất bại.',
      });
    }
  },
);

export const getSimilarPost = createAsyncThunk<
  PostS,
  {postId: string; page?: number},
  {rejectValue: {message: string}}
>('search/posts/similar', async ({postId, page = 1}, {rejectWithValue}) => {
  try {
    const res = await axiosInstance.get(
      `${API.GET_SIMILAR_POST}/${postId}/similar`,
      {
        params: {page},
        headers: {
          token: 'refresh',
        },
      },
    );
    return res.data;
  } catch (error: any) {
    return rejectWithValue({
      message:
        error?.response?.data?.message || 'Lấy danh sách bài viết thất bại.',
    });
  }
});

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    // ADD CLEANUP ACTIONS
    clearSearchResults: state => {
      state.posts = undefined;
      state.users = undefined;
      state.isError = false;
      state.errorMessage = undefined;
    },
    resetSearchState: () => initialState,
    cancelSearch: state => {
      state.isLoading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSearchPost.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = undefined;
      })
      .addCase(fetchSearchPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload;
      })
      .addCase(fetchSearchPost.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload?.message !== 'Search cancelled') {
          state.isError = true;
          state.errorMessage = action.payload?.message;
        }
      })
      .addCase(fetchSearchUser.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = undefined;
      })
      .addCase(fetchSearchUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchSearchUser.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload?.message !== 'Search cancelled') {
          state.isError = true;
          state.errorMessage = action.payload?.message;
        }
      });
  },
});

export const {clearSearchResults, resetSearchState, cancelSearch} =
  searchSlice.actions;
export default searchSlice.reducer;
