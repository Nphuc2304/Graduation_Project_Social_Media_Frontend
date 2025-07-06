import {useCallback, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {AppDispatch} from '../../../../services/store';
import {
  likePost,
  unlikePost,
} from '../../../../services/reactionRedux/reactionSlice';
import {hidePost} from '../../../../services/postRedux/postSlice';
import {handleFollowToggle, handleBookmark} from '../util';
import {ItemHomeProps} from '../types';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';

export const useItemHomeActions = (
  props: ItemHomeProps,
  state: any,
  isFollow: boolean,
) => {
  const pendingLikeRequest = useRef<Promise<any> | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const {_id, user, likeCount} = props;

  const {
    isLiked,
    setIsLiked,
    setNumLike,
    likePosts,
    refreshToken,
    userID,
    handleName,
    loading,
    isBookmark,
    setIsBookmark,
    playlists,
    itemsByPlaylist,
  } = state;

  const handleLike = useCallback(async () => {
    if (pendingLikeRequest.current) {
      try {
        await pendingLikeRequest.current;
      } catch (error) {
        // Ignore errors from previous requests
      }
    }

    // Determine the action based on current state
    const shouldLike = !isLiked;
    const requestPromise = dispatch(
      (shouldLike ? likePost : unlikePost)({
        postId: _id,
        refreshToken,
        receiverId: user._id,
        handleName: handleName,
        userId: userID
      }),
    ).unwrap();

    // Store the pending request
    pendingLikeRequest.current = requestPromise;

    // Optimistic update
    setIsLiked(shouldLike);
    setNumLike((prev: number) => prev + (shouldLike ? 1 : -1));

    try {
      await requestPromise;
      // Success - Redux state is already updated by the fulfilled action
      // No need to manually dispatch addLikedPost/removeLikedPost here
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!shouldLike);
      setNumLike((prev: number) => prev + (shouldLike ? -1 : 1));
      console.log('❌ Like/Unlike failed:', error);
    } finally {
      // Clear the pending request
      pendingLikeRequest.current = null;
    }
  }, [
    isLiked,
    _id,
    refreshToken,
    userID,
    user._id,
    handleName,
    dispatch,
    setIsLiked,
    setNumLike,
  ]);

  const handleHidePost = useCallback(() => {
    dispatch(hidePost(_id))
      .unwrap()
      .catch(() => {
        GlobalAlertManager.show('Thất bại', 'Ẩn bài viết lỗi');
      });
  }, [_id]);

  const handleFollowAction = useCallback((mine: any) => {
    handleFollowToggle({
      userId: user._id,
      follow: isFollow,
      senderId: mine?._id,
      handleName: mine?.handleName,
      dispatch,
    });
  }, [user._id, isFollow, dispatch]);

  const handleBookmarkAction = useCallback(() => {
    handleBookmark({
      isBookmarked: isBookmark,
      _id,
      refreshToken,
      setIsBookmarked: setIsBookmark,
      dispatch,
    });
  }, [isBookmark, _id, playlists, refreshToken, itemsByPlaylist, dispatch]);

  return {
    handleLike,
    handleHidePost,
    handleFollowAction,
    handleBookmarkAction,
  };
};
