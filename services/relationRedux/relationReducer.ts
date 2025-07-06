import {createSlice} from '@reduxjs/toolkit';
import {UserProfile, RelationWithUser} from './relationTypes';
import {fetchFollowers, fetchFollowing, fetchBlocking, fetchRecommendations, relationAction} from './relationSlice';

interface RelationState {
  followers: UserProfile[];
  following: UserProfile[];
  blocking:    UserProfile[]; 
  recommendations: UserProfile[];
  loading: boolean;
  error: string | null;
}

const initialState: RelationState = {
  followers: [],
  following: [],
  blocking: [],
  recommendations: [],
  loading: false,
  error: null,
};

const relationReducer = createSlice({
  name: 'relations',
  initialState,
  reducers: {
    clearRelations: state => {
      state.followers = [];
      state.following = [];
      state.blocking = [];  
      state.recommendations = [];
      state.error = null;
    },
    clearError: state => {
      state.error = null;
    },
    clearBlocking: state => {   
      state.blocking = [];
    },
    clearRecommendations: state => {
      state.recommendations = [];
    },
  },
  extraReducers: builder => {
    builder
        //fetchFollower
      .addCase(fetchFollowers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.loading = false;
        state.followers = action.payload;
      })
      .addCase(fetchFollowers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Tải dữ liệu người theo dõi thất bại';
      })
        
        //fetchFollowing
      .addCase(fetchFollowing.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.loading = false;
        state.following = action.payload;
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Tải dữ liệu người đang theo dõi thất bại';
      })

        // fetchBlocking
      .addCase(fetchBlocking.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchBlocking.fulfilled, (state, action) => {
        state.loading  = false;
        state.blocking = action.payload;
      })
      .addCase(fetchBlocking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Tải dữ liệu người bị chặn thất bại';
      })

      // fetchRecommendations
      .addCase(fetchRecommendations.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Tải dữ liệu gợi ý thất bại';
      })
      //relationAction
      .addCase(relationAction.fulfilled, (state, { meta, payload }) => {
        const { action, targetId } = meta.arg;
        if (action === 'follow') {
          const u = state.followers.find(u => u._id === targetId);
          if (u) {
            state.following.unshift(u);
          }
        } 
        if (action === 'unfollow') {
          state.following = state.following.filter(u => u._id !== targetId);
        }
      });
  },
});

export const {clearRelations, clearError, clearRecommendations} = relationReducer.actions;
export default relationReducer.reducer;
