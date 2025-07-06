import {createSlice} from '@reduxjs/toolkit';
import {ItemNoti} from './notificationTypes';
import {getNotification, markAsReadNoti} from './notificationSlice';

interface NotificationState {
  notifications: ItemNoti[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  isReadNoti: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  isLoading: false,
  isLoadingMore: false,
  isError: false,
  isSuccess: false,
  errorMessage: null,
  pagination: null,
  isReadNoti: false,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    markAllAsRead(state) {
      state.notifications = state.notifications.map(item => ({
        ...item,
        isRead: true,
      }));
    },
    markAsRead(state, action) {
      const notiId = action.payload;
      state.notifications = state.notifications.map(item =>
        item._id === notiId ? {...item, isRead: true} : item,
      );
    },
    clearNotifications(state) {
      state.notifications = [];
    },
    resetStatus(state) {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.errorMessage = null;
    },
    setIsReadNoti(state, action) {
      state.isReadNoti = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getNotification.pending, (state, action) => {
        if (action.meta.arg.page && action.meta.arg.page > 1) {
          state.isLoadingMore = true;
        } else {
          state.isLoading = true;
          state.isError = false;
          state.isSuccess = false;
          state.errorMessage = null;
        }
      })
      .addCase(getNotification.fulfilled, (state, action) => {
        const {data: newNotis, pagination} = action.payload;
        const existingIds = new Set(state.notifications.map(n => n._id));
        const uniqueNewNotis = newNotis.filter(n => !existingIds.has(n._id));

        state.pagination = pagination;
        state.isLoading = false;
        state.isLoadingMore = false;
        state.isSuccess = true;

        if (pagination.page > 1) {
          state.notifications = [...state.notifications, ...uniqueNewNotis];
        } else {
          state.notifications = [...newNotis];
        }
      })

      .addCase(getNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.isError = true;
        state.errorMessage =
          action.payload?.message || 'Lỗi khi lấy danh sách thông báo';
      })

      .addCase(markAsReadNoti.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
      })
      .addCase(markAsReadNoti.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const updateId = action.meta.arg;
        state.notifications = state.notifications.map(n =>
          n._id === updateId.id ? {...n, isRead: true} : n,
        );
      })
      .addCase(markAsReadNoti.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage =
          action.error.message || 'Khổng thể đánh dấu đã đọc.';
      });
  },
});

export const {markAllAsRead, markAsRead, clearNotifications, resetStatus, setIsReadNoti} =
  notificationSlice.actions;

export default notificationSlice.reducer;
