import {createAsyncThunk} from '@reduxjs/toolkit';
import axiosInstance from '../axiosInstance';
import {LikePostParams} from './reactionTypes';
import {API} from '@services/api';

export const likePost = createAsyncThunk(
  'reactions/likePost',
  async (
    {postId, refreshToken, receiverId, handleName, userId}: LikePostParams,
    thunkAPI,
  ) => {
    try {
      if (!refreshToken) {
        return thunkAPI.rejectWithValue(
          'Mời bạn đăng nhập để tiếp tục yêu thích bài viết',
        );
      }

      const res = await axiosInstance.post(
        `post-like/${postId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.status >= 200 && res.status <= 300 && userId !== receiverId) {
        await axiosInstance.post(
          API.NOTIFICATION_API,
          {
            receiverIds: [receiverId],
            title: `❤️ ${handleName} đã thích bài viết của bạn!`,
            body: 'Nhấn để xem chi tiết.',
            data: {
              type: 'like',
              postId,
            },
          },
          {
            headers: {
              token: 'refresh',
            },
          },
        );
      }

      return {postId};
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Yêu thích bài viết thất bại',
      );
    }
  },
);

export const unlikePost = createAsyncThunk(
  'reactions/unlikePost',
  async (
    {postId, refreshToken, receiverId, handleName, userId}: LikePostParams,
    thunkAPI,
  ) => {
    try {
      if (!refreshToken) {
        return thunkAPI.rejectWithValue('Mời bạn đăng nhập để tiếp tục');
      }

      const res = await axiosInstance.delete(`post-like/${postId}`, {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      return {postId};
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Bỏ yêu thích thất bại!',
      );
    }
  },
);
