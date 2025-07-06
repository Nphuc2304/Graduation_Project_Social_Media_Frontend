import {createAsyncThunk} from '@reduxjs/toolkit';
import {ItemNoti, ResNoti} from './notificationTypes';
import axiosInstance from '@services/axiosInstance';
import {API} from '@services/api';

export const getNotification = createAsyncThunk<
  ResNoti,
  {page?: number, limit?: number},
  {rejectValue: {message: string}}
>('notifications', async ({page = 1, limit = 20}, {rejectWithValue}) => {
  try {
    const response = await axiosInstance.get(API.GET_NOTIFICATIONS, {
      headers: {
        token: 'refresh',
      },
      params: {
        page,
        limit,
      }
    });
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message:
        error?.response?.data?.message || 'Lấy danh sách thông báo thất bại.',
    });
  }
});

export const markAsReadNoti = createAsyncThunk<
  {success: boolean; message: string},
  {id: string},
  {rejectValue: {message: string}}
>(
  'notification/markAsRead',
  async ({id}, {rejectWithValue}) => {
    try {
      const res = await axiosInstance.post(`http://cirla.io.vn/notification/${id}/read`, {}, {
        headers: {
          token: 'refresh',
        }
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue({message: error?.response?.data?.message || 'Không thể đánh dấu đã đọc.'});
    }
  },
);

export const getUnreadNotificationCount = (notifications: ItemNoti[]): number => {
  return notifications.reduce((count, noti) => {
    return !noti.isRead ? count + 1 : count;
  }, 0);
};

