import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Story, userFollow} from './StoryType';
import {
  fetchFollowingStories,
  fetchGetPostedSotry,
  seenStory,
  toggleLikeStory,
  fetchStoryDetails,
  createHighlightStory,
  fetchHighlightStory, // New thunk
  deleteStory,
  createStory,
} from './StorySlice';

interface StoryState {
  followingUsers: userFollow[];
  storyDetails: Story[];
  myStories: Story[];
  highlightStories: Story[];
  loading: boolean;
  error: string | null;
}

const initialState: StoryState = {
  followingUsers: [],
  storyDetails: [],
  myStories: [],
  highlightStories: [],
  loading: false,
  error: null,
};

const storySlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    clearHighlightStories: state => {
      state.highlightStories = [];
    },
    forceRefreshStories: state => {
      // Trigger re-render by updating a timestamp
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // ====== FOLLOWING STORIES ======
      .addCase(fetchFollowingStories.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingStories.fulfilled, (state, action) => {
        const users = Array.isArray(action.payload)
          ? action.payload
          : [action.payload];

        state.followingUsers = users;
        state.loading = false;

        for (const user of users) {
          const storyIds = user.stories || [];

          for (const storyId of storyIds) {
            const exists = state.storyDetails.some(s => s._id === storyId);
            if (!exists) {
              state.storyDetails.push({
                _id: storyId,
                ownerId: user._id,
                type: 'stories',
                mediaUrl: '',
                isArchived: false,
                thumbnail: '',
                viewedByUsers: [],
                likedByUsers: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      })
      .addCase(fetchFollowingStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Lỗi tải stories';
      })

      // ====== STORY DETAILS ======
      .addCase(fetchStoryDetails.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchStoryDetails.fulfilled,
        (state, action: PayloadAction<Story[]>) => {
          state.loading = false;
          action.payload.forEach(newStory => {
            const index = state.storyDetails.findIndex(
              s => s._id === newStory._id,
            );
            if (index !== -1) {
              state.storyDetails[index] = newStory;
            } else {
              state.storyDetails.push(newStory);
            }

            // Update storyDetails in followingUsers
            for (const user of state.followingUsers) {
              if (user.stories?.includes(newStory._id)) {
                if (!user.storyDetails) user.storyDetails = [];
                const userStoryIndex = user.storyDetails.findIndex(
                  s => s._id === newStory._id,
                );
                if (userStoryIndex !== -1) {
                  user.storyDetails[userStoryIndex] = newStory;
                } else {
                  user.storyDetails.push(newStory);
                }
              }
            }
          });
        },
      )
      .addCase(fetchStoryDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Lỗi tải chi tiết story';
      })

      // ====== SEEN STORY ======
      .addCase(seenStory.fulfilled, (state, action) => {
        const story = action.payload?.data;
        if (!story || !story._id) return;

        const index = state.storyDetails.findIndex(s => s._id === story._id);
        if (index !== -1) {
          state.storyDetails[index] = story;
        } else {
          state.storyDetails.push(story);
        }

        for (const user of state.followingUsers) {
          if (user.stories?.includes(story._id)) {
            if (!user.storyDetails) user.storyDetails = [];

            const idx = user.storyDetails.findIndex(s => s._id === story._id);
            if (idx !== -1) {
              user.storyDetails[idx] = story;
            } else {
              user.storyDetails.push(story);
            }
          }
        }
      })
      .addCase(seenStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Xem story thất bại';
      })

      // ====== MY STORIES ======
      .addCase(fetchGetPostedSotry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchGetPostedSotry.fulfilled,
        (state, action: PayloadAction<Story[]>) => {
          state.myStories = action.payload;
          state.loading = false;
        },
      )
      .addCase(fetchGetPostedSotry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể lấy story đã đăng';
      })

      // ====== LIKE STORY ======
      .addCase(toggleLikeStory.pending, state => {
        state.loading = true;
      })
      .addCase(
        toggleLikeStory.fulfilled,
        (
          state,
          action: PayloadAction<{
            storyId: string;
            likedByUsers: string[];
          }>,
        ) => {
          const {storyId, likedByUsers} = action.payload;

          const index = state.storyDetails.findIndex(s => s._id === storyId);
          if (index !== -1) {
            state.storyDetails[index].likedByUsers = likedByUsers;
          }

          for (const user of state.followingUsers) {
            const story = user.storyDetails?.find(s => s._id === storyId);
            if (story) {
              story.likedByUsers = likedByUsers;
            }
          }
        },
      )
      .addCase(toggleLikeStory.rejected, (state, action) => {
        state.error = action.payload || 'Không thể like story';
      })
      // ====== Create highlight story  ======
      .addCase(createHighlightStory.pending, state => {
        (state.loading = true), (state.error = null);
      })
      .addCase(
        createHighlightStory.fulfilled,
        (state, action: PayloadAction<Story>) => {
          state.loading = false;
          state.error = null;
          state.myStories.push(action.payload);
          // Thêm highlight mới vào highlightStories và sắp xếp lại theo thứ tự mới nhất
          state.highlightStories = [
            action.payload,
            ...state.highlightStories,
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        },
      )
      .addCase(createHighlightStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể tạo highlight';
      })
      // ====== GET HIGHLIGHT STORY ======

      .addCase(fetchHighlightStory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchHighlightStory.fulfilled,
        (state, action: PayloadAction<Story[]>) => {
          state.loading = false;
          // Sắp xếp highlight stories theo thứ tự mới nhất lên đầu
          state.highlightStories = action.payload.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        },
      )
      .addCase(fetchHighlightStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể lấy highlight stories';
      })

      // ====== DELETE STORY ======
      .addCase(deleteStory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteStory.fulfilled,
        (state, action: PayloadAction<{storyId: string}>) => {
          const {storyId} = action.payload;

          // Xóa khỏi myStories
          state.myStories = state.myStories.filter(
            story => story._id !== storyId,
          );

          // Xóa khỏi storyDetails
          state.storyDetails = state.storyDetails.filter(
            story => story._id !== storyId,
          );

          // Xóa khỏi followingUsers
          for (const user of state.followingUsers) {
            // Xóa story ID khỏi stories array
            if (user.stories) {
              user.stories = user.stories.filter(id => id !== storyId);
            }

            // Xóa khỏi storyDetails array
            if (user.storyDetails) {
              user.storyDetails = user.storyDetails.filter(
                story => story._id !== storyId,
              );
            }
          }

          state.loading = false;
        },
      )
      .addCase(deleteStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể xóa story';
      })
      // ====== CREATE STORY ======
      .addCase(createStory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStory.fulfilled, (state, action: PayloadAction<Story>) => {
        const newStory = action.payload;

        // Thêm vào myStories
        state.myStories.unshift(newStory);

        // Thêm vào storyDetails
        state.storyDetails.push(newStory);

        // Cập nhật followingUsers để thêm story ID mới
        for (const user of state.followingUsers) {
          if (user._id === newStory.ownerId) {
            if (!user.stories) user.stories = [];
            user.stories.unshift(newStory._id);

            if (!user.storyDetails) user.storyDetails = [];
            user.storyDetails.unshift(newStory);
            break;
          }
        }

        state.loading = false;
      })
      .addCase(createStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể tạo story';
      });
  },
});
export const {clearHighlightStories, forceRefreshStories} = storySlice.actions;
export default storySlice.reducer;
