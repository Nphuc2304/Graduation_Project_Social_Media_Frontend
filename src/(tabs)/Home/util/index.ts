import {relationAction} from '../../../../services/relationRedux/relationSlice';
import {AppDispatch} from '../../../../services/store';
import {
  removeBookmark,
  saveBookmark,
} from '../../../../services/bookmarkRedux/bookmarkSlice';
import {HandleBookmarkParams} from '../types';
import {
  fetchStoryDetails,
  seenStory,
} from '../../../../services/StoryRedux/StorySlice';
import {
  checkStorySeenInStorage,
  markStoryAsSeen,
} from '../../../../services/storage/storage';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';

export const handleBookmark = async ({
  isBookmarked,
  _id,
  refreshToken,
  setIsBookmarked,
  dispatch,
}: HandleBookmarkParams) => {
  if (!isBookmarked) {
    setIsBookmarked(true);
    try {
      await dispatch(
        saveBookmark({
          postId: _id,
          refreshToken,
        }),
      ).unwrap();
    } catch (res) {
      setIsBookmarked(false);
    }
  } else {
    setIsBookmarked(false);
    try {
      await dispatch(
        removeBookmark({
          postIds: [_id],
          refreshToken,
        }),
      ).unwrap();
    } catch (res) {
      setIsBookmarked(true);
    }
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} năm trước`;
  if (months > 0) return `${months} tháng trước`;
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return `Vừa xong`;
};

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num?.toString();
};

export const handleFollowToggle = async ({
  userId,
  follow,
  senderId,
  handleName,
  dispatch,
}: {
  userId: string;
  follow: boolean;
  senderId?: string;
  handleName?: string;
  dispatch: AppDispatch;
}) => {
  const actionType = follow ? 'unfollow' : 'follow';
  try {
    await dispatch(
      relationAction({
        targetId: userId,
        action: actionType,
        senderId,
        handleName,
      }),
    ).unwrap();
  } catch (error) {
    console.error('[ERROR] handleFollowToggle failed:', error);
    GlobalAlertManager.show(
      'Thất bại',
      `${actionType === 'follow' ? 'Theo dõi' : 'Bỏ theo dõi'} thất bại`,
    );
  }
};

export const handleUserPress = async (
  item: any,
  dispatch: any,
  navigation: any,
  storyDetails: any[],
  user: any,
  followingUsers: any[],
  setIsStoryLoading?: (val: boolean) => void,
  getCachedStoryData?: (userId: string) => any[] | null,
) => {
  const isCurrentUser =
    item._id === user?._id || item.handleName === user?.handleName;

  if (!item.stories.length && isCurrentUser) {
    navigation.navigate('UpStory');
    return;
  }

  try {
    // Check cache first
    const cachedData = getCachedStoryData?.(item._id);
    let basicStoryData;

    if (cachedData && cachedData.length > 0) {
      // Use cached data if available
      basicStoryData = cachedData;
    } else {
      // Fallback to existing stories or create skeleton
      basicStoryData = item.stories.map((storyId: string) => {
        const existingStory = storyDetails.find(s => s._id === storyId);
        return existingStory || {_id: storyId, isLoading: true};
      });
    }

    //  Create initial storyGroups - giữ nguyên thứ tự gốc
    const createInitialStoryGroups = () => {
      const allUsersWithStories = [user, ...followingUsers].filter(
        u => u.stories?.length > 0,
      );

      // ✅ Giữ nguyên original order từ followingUsers (như trên UI Home)
      const originalOrder = [
        // 1. Current user đầu tiên (như UI Home)
        ...allUsersWithStories.filter(
          u => u._id === user?._id || u.handleName === user?.handleName,
        ),
        // 2. Các users khác theo thứ tự trong followingUsers
        ...allUsersWithStories.filter(
          u => u._id !== user?._id && u.handleName !== user?.handleName,
        ),
      ];

      // Không thay đổi thứ tự, giữ nguyên originalOrder
      return originalOrder.map(u => ({
        creator: {
          username: u.handleName,
          profilePic: u.profilePic,
          _id: u._id,
        },
        stories: u.stories.map((storyId: string) => {
          const existingStory = storyDetails.find(s => s._id === storyId);
          return existingStory || {_id: storyId, isLoading: true};
        }),
      }));
    };

    const initialStoryGroups = createInitialStoryGroups();
    const initialGroupIndex = initialStoryGroups.findIndex(
      g => g.creator.username === item.handleName,
    );

    debugStoryGroups(
      initialStoryGroups,
      initialGroupIndex,
      'Story Groups (Original Order)',
    );

    // Navigate immediately với complete storyGroups structure
    const hasRealData = cachedData && cachedData.length > 0;

    navigation.navigate(isCurrentUser ? 'SeenStoryOwner' : 'SeenStory', {
      stories: basicStoryData,
      creator: {
        username: item.handleName,
        profilePic: item.profilePic,
        _id: item._id,
      },
      storyGroups: initialStoryGroups,
      storyGroupIndex: Math.max(0, initialGroupIndex),
      isLoading: !hasRealData, // Only show loading if no cached data
    });

    // If we already have cached data, no need to load again
    if (hasRealData) {
      setIsStoryLoading?.(false);
      return;
    }

    // Load real data trong background nếu chưa có cache, maintain original order
    const loadRealStoryData = async (usersList: any[]) => {
      const storyGroupsWithData = await Promise.all(
        usersList.map(async u => {
          const detailRes = await dispatch(
            fetchStoryDetails({storyIds: u.stories}),
          ).unwrap();

          const stories = await Promise.all(
            detailRes.map(async (story: any) => {
              try {
                await dispatch(seenStory({storyId: story._id}));
                const hasSeen = await checkStorySeenInStorage(
                  story._id,
                  story.createdAt,
                );
                if (!hasSeen) {
                  await markStoryAsSeen(story._id, story.createdAt);
                }

                const populatedTags = (story.tags || []).map((tag: any) => {
                  const userDetail = tag.user;
                  if (typeof userDetail === 'string') {
                    const foundUser =
                      story.viewedByUsers?.find(
                        (u: any) => u._id === userDetail,
                      ) ||
                      storyDetails
                        .flatMap(s => s.viewedByUsers || [])
                        .find((u: any) => u._id === userDetail);

                    return {
                      ...tag,
                      user: foundUser || {
                        _id: userDetail,
                        handleName: 'unknown',
                        username: 'unknown',
                      },
                    };
                  }
                  return tag;
                });

                return {
                  ...story,
                  isSeen: true,
                  tags: populatedTags,
                  uriVideo: story.mediaUrl.endsWith('.m3u8')
                    ? story.mediaUrl
                    : null,
                  image:
                    story.mediaUrl.endsWith('.jpg') ||
                    story.mediaUrl.endsWith('.png')
                      ? story.mediaUrl
                      : null,
                  isLoading: false,
                };
              } catch {
                return null;
              }
            }),
          );

          const validStories = stories.filter(s => s);
          return {
            creator: {
              username: u.handleName,
              profilePic: u.profilePic,
              _id: u._id,
            },
            stories: validStories,
          };
        }),
      );

      return storyGroupsWithData.filter(group => group.stories.length > 0);
    };

    // Maintain same ordering as initial groups - giữ nguyên thứ tự gốc
    const allUsersWithStories = [user, ...followingUsers].filter(
      u => u.stories?.length > 0,
    );

    // Giữ nguyên original order, không thay đổi thứ tự
    const sortedUsersWithStories = [
      // 1. Current user đầu tiên (như UI Home)
      ...allUsersWithStories.filter(
        u => u._id === user?._id || u.handleName === user?.handleName,
      ),
      // 2. Các users khác theo thứ tự trong followingUsers
      ...allUsersWithStories.filter(
        u => u._id !== user?._id && u.handleName !== user?.handleName,
      ),
    ];

    const finalStoryGroups = await loadRealStoryData(sortedUsersWithStories);

    const finalGroupIndex = finalStoryGroups.findIndex(
      g => g.creator.username === item.handleName,
    );

    if (finalGroupIndex === -1) {
      GlobalAlertManager.show('Lỗi', 'Không tìm thấy story để hiển thị');
      return;
    }

    //  Debug final story groups ordering
    debugStoryGroups(
      finalStoryGroups,
      finalGroupIndex,
      'Final Groups (Original Order + Real Data)',
    );

    // Update story screen với complete data, maintain ordering
    navigation.setParams({
      stories: finalStoryGroups[finalGroupIndex].stories,
      creator: finalStoryGroups[finalGroupIndex].creator,
      storyGroups: finalStoryGroups,
      storyGroupIndex: finalGroupIndex,
      isLoading: false,
    });
  } catch (error) {
    GlobalAlertManager.show('Lỗi', 'Lỗi khi tải story');
    navigation.goBack();
  } finally {
    setIsStoryLoading?.(false);
  }
};

//  Debug function để test story navigation flow
export const debugStoryGroups = (
  storyGroups: any[],
  currentIndex: number,
  title?: string,
) => {
  console.log(`📱 ${title || 'Story Groups Debug'}:`);
  storyGroups.forEach((group, index) => {
    const indicator = index === currentIndex ? '👉' : '  ';
    console.log(
      `${indicator} [${index}] ${group.creator.username} (${group.stories.length} stories)`,
    );
  });
  console.log('---');
};

export const handleHighlightPress = async (
  story: any,
  dispatch: AppDispatch,
  navigation: any,
  viewerUser: any,
  isOwner: boolean,
  allHighlights?: any[], // Thêm parameter để truyền tất cả highlights
  currentHighlightIndex?: number, // Thêm parameter để biết index hiện tại
) => {
  try {
    const detailRes = await dispatch(
      fetchStoryDetails({storyIds: story.storyId}),
    ).unwrap();

    const seenedStories = await Promise.all(
      detailRes.map(async (item: any) => {
        try {
          await dispatch(seenStory({storyId: item._id}));

          const hasSeen = await checkStorySeenInStorage(
            item._id,
            item.createdAt,
          );
          if (!hasSeen) {
            await markStoryAsSeen(item._id, item.createdAt);
          }

          return {
            ...item,
            uriVideo: item.mediaUrl?.endsWith('.m3u8') ? item.mediaUrl : null,
            image:
              item.mediaUrl?.endsWith('.jpg') || item.mediaUrl?.endsWith('.png')
                ? item.mediaUrl
                : null,
          };
        } catch (err) {
          console.error('seenStory error', err);
          return null;
        }
      }),
    );

    const validStories = seenedStories.filter(s => s);

    if (!validStories.length) {
      GlobalAlertManager.show('Lỗi', 'Không có story hợp lệ để hiển thị');
      return;
    }

    // Sử dụng thông tin từ viewerUser (người sở hữu highlight)
    const creator = {
      username: viewerUser?.handleName,
      profilePic: viewerUser?.profilePic,
      _id: viewerUser?._id,
    };

    // Tạo storyGroups cho tất cả highlights nếu có
    let storyGroups: any[] = [];

    if (allHighlights && allHighlights.length > 0) {
      // Tạo storyGroups cho tất cả highlights
      storyGroups = allHighlights.map((highlight, index) => ({
        creator,
        stories: [] as any[], // Sẽ được populate sau
        highlightId: highlight._id,
        collectionName: highlight.collectionName,
        highlightIndex: index,
      }));

      // Set stories cho highlight hiện tại
      if (
        currentHighlightIndex !== undefined &&
        storyGroups[currentHighlightIndex]
      ) {
        storyGroups[currentHighlightIndex].stories = validStories;
      }
    } else {
      // Fallback cho trường hợp không có allHighlights
      storyGroups = [
        {
          creator,
          stories: validStories,
        },
      ];
    }

    navigation.navigate(isOwner ? 'SeenStoryOwner' : 'SeenStory', {
      storyGroups,
      storyGroupIndex: currentHighlightIndex || 0,
      creator,
      stories: validStories, // Giữ lại để tương thích với SeenStory
      timestamp: Date.now(),
      isHighlightMode: true, // Thêm flag để biết đang xem highlight mode
      allHighlights, // Truyền thêm để có thể navigate giữa các highlights
    });
  } catch (error) {
    GlobalAlertManager.show('Thất bại', 'Lỗi khi tải highlight');
  }
};
