import {createAsyncThunk} from '@reduxjs/toolkit';
import axiosInstance from '../axiosInstance';
import {API} from '../api';
import {Comment, CommentPost, ReqComment, UserComment} from './commentTypes';

export const fetchCommentsByPost = createAsyncThunk<
  CommentPost[],
  string,
  {rejectValue: string}
>('comments/fetchByPost', async (postId, {rejectWithValue}) => {
  try {
    const response = await axiosInstance.get(
      `${API.GET_COMMENT_POST}/${postId}`,
      {
        headers: {
          token: 'refresh',
        },
      },
    );
    return response.data as CommentPost[];
  } catch (err: any) {
    return rejectWithValue(err.response?.data || 'Network error');
  }
});

export const addComment = createAsyncThunk<
  { comment: Comment; user: UserComment },
  ReqComment,
  { rejectValue: string }
>(
  'comments/add',
  async ({payload, handleName, receiverId, postId, userId}, { rejectWithValue, getState }) => {
    try {
      const res = await axiosInstance.post(API.ADD_COMMENT, payload, {
        headers: { token: 'refresh' },
      });

      const commentData = res.data;

      const newComment: Comment = {
        id: commentData._id,
        postID: commentData.postID,
        parentID: commentData.parentID,
        content: commentData.content,
        mediaUrl: commentData.mediaUrl,
        isDeleted: commentData.isDeleted,
        likedBy: commentData.likedBy,
        createdAt: commentData.createdAt,
        reply: [[], { _id: '', handleName: '', profilePic: '' }],
      };

      const state: any = getState();
      const currentUser = state.user.user;

      const user: UserComment = {
        _id: currentUser?._id || '',
        handleName: handleName || '',
        profilePic: currentUser?.profilePic,
      };

      if (response.status >= 200 && response.status <= 300 && userId !== receiverId) {
        await axiosInstance.post(
          API.NOTIFICATION_API,
          {
            receiverIds: [receiverId],
            title: `${handleName} đã bình luận bài viết của bạn`,
            body: 'Nhấn vào để xem chi tiết...',
            data: {
              type: 'comment',
              postId,
              commentId: response.data?.comment?._id,
            },
          },
          {
            headers: { token: 'refresh' },
          },
        );
      }

      return { comment: newComment, user };

    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Bình luận thất bại');
    }
  }
);

export const likeComment = createAsyncThunk<any, string, {rejectValue: string}>(
  'comments/like',
  async (commentId, {rejectWithValue}) => {
    try {
      const res = await axiosInstance.post(
        `${API.COMMENT}/${commentId}/like`,
        null,
        {
          headers: {
            token: 'refresh',
          },
        },
      );
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const unlikeComment = createAsyncThunk<
  any,
  string,
  {rejectValue: string}
>('comments/unlike', async (commentId, {rejectWithValue}) => {
  try {
    const res = await axiosInstance.post(
      `${API.COMMENT}/${commentId}/unlike`,
      null,
      {
        headers: {
          token: 'refresh',
        },
      },
    );
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data || err.message);
  }
});
