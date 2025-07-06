import {useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {
  fetchFollowers,
  fetchFollowing,
} from '@services/relationRedux/relationSlice';
import {fetchTaggedPosts} from '@services/taggedPostRedux/taggedPostSlice';
import {fetchHighlightStory} from '@services/StoryRedux/StorySlice';

export const useProfileData = () => {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user?.user?._id);
  const isInitialFetchDone = useRef(false);

  // Fetch tất cả dữ liệu cần thiết cho Profile
  const fetchProfileData = useCallback(async () => {
    if (!userId || isInitialFetchDone.current) {
      return;
    }

    try {
      // Fetch song song tất cả dữ liệu
      await Promise.all([
        dispatch(fetchFollowers({userId})),
        dispatch(fetchFollowing({userId})),
        dispatch(fetchTaggedPosts(userId)),
        dispatch(fetchHighlightStory({userId})),
      ]);

      isInitialFetchDone.current = true;
    } catch (error) {
      console.error('❌ Error fetching profile data:', error);
    }
  }, [dispatch, userId]);

  // Fetch ngầm khi component mount
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Reset khi userId thay đổi
  useEffect(() => {
    if (userId) {
      isInitialFetchDone.current = false;
    }
  }, [userId]);

  return {
    fetchProfileData,
  };
};
