import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {fetchPostsWithMedia, fetchReelsWithMedia, hidePost} from './postSlice';
import {PostWithMedia} from './postTypes';
import {DeleteMyPost} from '@services/postUserRedux/postUserSlice';

interface PostState {
  posts: PostWithMedia[];
  reels: PostWithMedia[];
  loading: boolean;
  error: string | null;
  page: number;
  hasNextPage: boolean;
  totalItemsLoaded: number;
  firstPageItems: PostWithMedia[];
  lastFetchedPage: number;
}

const initialState: PostState = {
  posts: [],
  reels: [],
  loading: false,
  error: null,
  page: 1,
  hasNextPage: true,
  totalItemsLoaded: 0,
  firstPageItems: [],
  lastFetchedPage: 0,
};

const postReducer = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    updateIsFollowByUserId: (state, action) => {
      const {userId, isFollow} = action.payload;

      const updatedPosts = state.posts.map(item =>
        item.userID === userId
          ? {
              ...item,
              isFollow,
            }
          : item,
      );

      state.posts.length = 0;
      state.posts.push(...updatedPosts);

      const updatedReels = state.reels.map(item =>
        item.userID === userId
          ? {
              ...item,
              isFollow,
            }
          : item,
      );

      state.reels.length = 0;
      state.reels.push(...updatedReels);

      const updatedFirstPageItems = state.firstPageItems.map(item =>
        item.userID === userId
          ? {
              ...item,
              isFollow,
            }
          : item,
      );

      state.firstPageItems.length = 0;
      state.firstPageItems.push(...updatedFirstPageItems);
    },
    trimOldReels: (state, action) => {
      const itemsToRemove = action.payload;
      if (state.reels.length > itemsToRemove) {
        // Remove items from the beginning (oldest items)
        state.reels.splice(0, itemsToRemove);
      }
    },

    resetReels: state => {
      state.reels = [];
      state.page = 1;
      state.hasNextPage = true;
      state.totalItemsLoaded = 0;
      state.firstPageItems = [];
      state.error = null;
      state.lastFetchedPage = 0;
    },
    resetPosts: state => {
      state.posts = [];
      state.page = 1;
      state.hasNextPage = true;
      state.totalItemsLoaded = 0;
      state.firstPageItems = [];
      state.error = null;
      state.lastFetchedPage = 0;
    },
    incrementCommentCountByPostId: (state, action) => {
      const postId = action.payload;

      const updateCommentCount = (list: PostWithMedia[]) => {
        return list.map(post =>
          post._id === postId
            ? {
                ...post,
                commentCount: (post.commentCount || 0) + 1,
              }
            : post,
        );
      };

      state.posts = updateCommentCount(state.posts);
      state.reels = updateCommentCount(state.reels);
      state.firstPageItems = updateCommentCount(state.firstPageItems);
    },
    updateLikeByPostId: (
      state,
      action: PayloadAction<{postId: string; isLike: boolean}>,
    ) => {
      const {postId, isLike} = action.payload;
      const delta = isLike ? 1 : -1;

      const updateList = (list: PostWithMedia[]) =>
        list.map(post => {
          if (post._id !== postId) return post;
          const current = post.likeCount || 0;
          return {
            ...post,
            isLike,
            likeCount: Math.max(0, current + delta),
          };
        });

      state.posts = updateList(state.posts);
      state.reels = updateList(state.reels);
      state.firstPageItems = updateList(state.firstPageItems);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPostsWithMedia.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostsWithMedia.fulfilled, (state, action) => {
        state.loading = false;
        const {items, pagination} = action.payload;
        const requestedPage = action.meta.arg.page;
        
        // Prevent processing the same page multiple times
        if (requestedPage <= state.lastFetchedPage && requestedPage > 1) {
          console.warn(`Page ${requestedPage} already processed, skipping...`);
          return;
        }
        
        if (requestedPage > 1) {
          // Filter out any items that already exist to prevent duplicates
          const existingIds = new Set(state.posts.map(post => post._id));
          const newItems = items.filter(item => !existingIds.has(item._id));
          
          if (newItems.length > 0) {
            state.posts.push(...newItems);
            state.lastFetchedPage = requestedPage;
          }
        } else {
          // For page 1, replace all posts
          state.posts = items;
          state.lastFetchedPage = 1;
        }
        
        state.page = pagination.currentPage;
        state.hasNextPage = pagination.hasNextPage;
        state.totalItemsLoaded = state.posts.length;
      })
      .addCase(fetchPostsWithMedia.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      /// reels
      .addCase(fetchReelsWithMedia.pending, (state, action) => {
        // Only show loading for initial load or if no items exist
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReelsWithMedia.fulfilled, (state, action) => {
        state.loading = false;
        const {items, pagination, isLoadMore} = action.payload;

        if (isLoadMore) {
          const newItems = items.filter(
            i => !state.reels.some(existing => existing._id === i._id),
          );
          state.reels.push(...newItems);
        } else {
          // initial load or pull-to-refresh: replace the entire list
          state.reels = [...items];
          state.firstPageItems = [...items];
        }

        state.page = pagination.currentPage;
        state.hasNextPage = pagination.hasNextPage;
        state.totalItemsLoaded = state.reels.length;

        // Remove old items
        const MAX_ITEMS = 50;
        const ITEMS_TO_REMOVE = 20;

        if (state.reels.length > MAX_ITEMS && pagination.currentPage > 3) {
          state.reels.splice(0, ITEMS_TO_REMOVE);
        }
      })
      .addCase(fetchReelsWithMedia.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(hidePost.fulfilled, (state, action) => {
        const postId = action.meta.arg;
        state.posts = state.posts.filter(
          (post: PostWithMedia) => post._id !== postId,
        );
        state.reels = state.reels.filter(
          (post: PostWithMedia) => post._id !== postId,
        );
      })
      .addCase(DeleteMyPost.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(DeleteMyPost.fulfilled, (state, action) => {
        state.loading = false;
        const {modifiedCount} = action.payload;
        if (modifiedCount > 0) {
          const {postIds} = action.meta.arg;

          const filterItems = (items?: PostWithMedia[]) =>
            items?.filter(item => !postIds.includes(item._id ?? '')) || [];

          state.posts = filterItems(state.posts);
          state.reels = filterItems(state.reels);
        }
      })
      .addCase(DeleteMyPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Xóa bài viết thất bại.';
      });
  },
});

export const {
  updateIsFollowByUserId,
  trimOldReels,
  resetReels,
  resetPosts,
  incrementCommentCountByPostId,
  updateLikeByPostId,
} = postReducer.actions;
export default postReducer.reducer;
