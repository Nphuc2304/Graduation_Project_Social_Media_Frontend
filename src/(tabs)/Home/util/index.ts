import {relationAction} from '../../../../services/relationRedux/relationSlice';
import {AppDispatch, store} from '../../../../services/store';
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
import {Story, userFollow, UserMini} from '@services/StoryRedux/StoryType';
import {User} from '@services/userRedux/userTypes';
import {DeleteMyPost} from '@services/postUserRedux/postUserSlice';

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
  onFollowChange,
}: {
  userId: string;
  follow: boolean;
  senderId?: string;
  handleName?: string;
  dispatch: AppDispatch;
  onFollowChange?: (userId: string, isFollow: boolean) => void;
}) => {
  const actionType = follow ? 'unfollow' : 'follow';
  try {
    onFollowChange?.(userId, actionType === 'follow');
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
  item: userFollow,
  dispatch: AppDispatch,
  navigation: any,
  storyDetails: Story[],
  user: User | null,
  followingUsers: any[],
  setIsStoryLoading?: (val: boolean) => void,
  getCachedStoryData?: (userId: string) => Story[] | null,
) => {
  const isCurrentUser =
    item._id === user?._id || item.handleName === user?.handleName;

  if (!item.stories.length && isCurrentUser) {
    navigation.navigate('UpStory');
    return;
  }

  try {
    // ✅ Check cache first
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

    // ✅ Create initial storyGroups - giữ nguyên thứ tự gốc
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

      // ✅ Không thay đổi thứ tự, giữ nguyên originalOrder
      return originalOrder.map(u => ({
        creator: {
          username: u.username, // ✅ Hiển thị username thực sự
          handleName: u.handleName, // ✅ Giữ handleName để xử lý logic
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
      g => g.creator.handleName === item.handleName, // ✅ Sử dụng handleName cho logic so sánh
    );

    debugStoryGroups(
      initialStoryGroups,
      initialGroupIndex,
      'Story Groups (Original Order)',
    );

    // ✅ Navigate immediately với complete storyGroups structure
    const hasRealData = cachedData && cachedData.length > 0;

    navigation.navigate('SeenStory', {
      stories: basicStoryData,
      creator: {
        username: item.username, // ✅ Hiển thị username thực sự
        handleName: item.handleName, // ✅ Giữ handleName để xử lý logic
        profilePic: item.profilePic,
        _id: item._id,
      },
      storyGroups: initialStoryGroups,
      storyGroupIndex: Math.max(0, initialGroupIndex),
      isLoading: !hasRealData, // Only show loading if no cached data
    });

    // ✅ If we already have cached data, still need to mark stories as seen and get updated data
    if (hasRealData) {
      // Mark stories as seen first
      await Promise.all(
        basicStoryData.map(
          async (story: Story | {_id: string; isLoading: boolean}) => {
            try {
              await dispatch(seenStory({storyId: story._id}));
              if ('createdAt' in story) {
                const hasSeen = await checkStorySeenInStorage(
                  story._id,
                  story.createdAt,
                );
                if (!hasSeen) {
                  await markStoryAsSeen(story._id, story.createdAt);
                }
              }
            } catch (error) {
              console.error('Error marking cached story as seen:', error);
            }
          },
        ),
      );

      // Fetch updated story data to get latest viewedByUsers
      try {
        const storyIds = basicStoryData.map(
          (story: Story | {_id: string; isLoading: boolean}) => story._id,
        );
        const updatedStoryDetails = await dispatch(
          fetchStoryDetails({storyIds}),
        ).unwrap();

        // Update navigation params with fresh story data
        navigation.setParams({
          stories: updatedStoryDetails,
          creator: {
            username: item.username, // ✅ Sửa: dùng username thay vì handleName
            handleName: item.handleName, // ✅ Thêm handleName để xử lý logic
            profilePic: item.profilePic,
            _id: item._id,
          },
          storyGroups: initialStoryGroups.map(group =>
            group.creator.username === item.username // ✅ Sửa: so sánh với username thay vì handleName
              ? {...group, stories: updatedStoryDetails}
              : group,
          ),
          storyGroupIndex: Math.max(0, initialGroupIndex),
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching updated story data:', error);
      }

      setIsStoryLoading?.(false);
      return;
    }

    // ✅ Load real data trong background nếu chưa có cache, maintain original order
    const loadRealStoryData = async (usersList: any[]) => {
      const storyGroupsWithData = await Promise.all(
        usersList.map(async u => {
          const detailRes = await dispatch(
            fetchStoryDetails({storyIds: u.stories}),
          ).unwrap();

          const stories = await Promise.all(
            detailRes.map(async (story: Story) => {
              try {
                await dispatch(seenStory({storyId: story._id}));
                const hasSeen = await checkStorySeenInStorage(
                  story._id,
                  story.createdAt,
                );
                if (!hasSeen) {
                  await markStoryAsSeen(story._id, story.createdAt);
                }

                const populatedTags = (story.tags || []).map(
                  (tag: {
                    user: UserMini;
                    position: {
                      x: number;
                      y: number;
                    };
                  }) => {
                    // Giữ nguyên cấu trúc gốc, chỉ đảm bảo user field là string ID
                    return {
                      ...tag,
                      // Đảm bảo user field vẫn là string ID như gốc
                      user:
                        typeof tag.user === 'string'
                          ? tag.user
                          : tag.user?._id || tag.user,
                    };
                  },
                );

                return {
                  ...story,
                  isSeen: true,
                  tags: populatedTags,
                  uriVideo: story.mediaUrl.endsWith('.mp4')
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
              username: u.username, // ✅ Hiển thị username thực sự
              handleName: u.handleName, // ✅ Giữ handleName để xử lý logic
              profilePic: u.profilePic,
              _id: u._id,
            },
            stories: validStories,
          };
        }),
      );

      return storyGroupsWithData.filter(group => group.stories.length > 0);
    };

    // ✅ Maintain same ordering as initial groups - giữ nguyên thứ tự gốc
    const allUsersWithStories = [user, ...followingUsers].filter(
      u => u.stories?.length > 0,
    );

    // ✅ Giữ nguyên original order, không thay đổi thứ tự
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
      g => g.creator.handleName === item.handleName, // ✅ Sử dụng handleName cho logic so sánh
    );

    if (finalGroupIndex === -1) {
      GlobalAlertManager.show('Lỗi', 'Không tìm thấy story để hiển thị');
      return;
    }

    // ✅ Debug final story groups ordering
    debugStoryGroups(
      finalStoryGroups,
      finalGroupIndex,
      'Final Groups (Original Order + Real Data)',
    );

    // ✅ Update story screen với complete data, maintain ordering
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

// ✅ Debug function để test story navigation flow
export const debugStoryGroups = (
  storyGroups: any[],
  currentIndex: number,
  title?: string,
) => {
  // console.log(`📱 ${title || 'Story Groups Debug'}:`);
  // storyGroups.forEach((group, index) => {
  //   const indicator = index === currentIndex ? '👉' : '  ';
  //   console.log(
  //     `${indicator} [${index}] ${group.creator.username} (${group.stories.length} stories)`,
  //   );
  // });
  // console.log('---');
};

export const handleHighlightPress = async (
  story: any,
  dispatch: AppDispatch,
  navigation: any,
  viewerUser: any,
  isOwner: boolean,
  highlightStories?: Story[],
) => {
  try {
    // Validate input
    if (!story || !story.storyIds || !Array.isArray(story.storyIds)) {
      GlobalAlertManager.show('Lỗi', 'Dữ liệu highlight không hợp lệ');
      return;
    }

    // Lấy story details từ Redux state trước (đã được pre-load)
    const state = store.getState();
    const existingStoryDetails = state.stories.storyDetails || [];

    // Tìm stories đã có trong state
    const existingStories = (story.storyIds || [])
      .map((storyId: string) =>
        existingStoryDetails.find(s => s._id === storyId),
      )
      .filter(Boolean);

    // Nếu chưa có đủ stories trong state, fetch thêm
    let detailRes = existingStories;
    if (existingStories.length < (story.storyIds || []).length) {
      const missingStoryIds = (story.storyIds || []).filter(
        (storyId: string) =>
          !existingStories.find((s: any) => s._id === storyId),
      );

      if (missingStoryIds.length > 0) {
        try {
          const fetchedStories = await dispatch(
            fetchStoryDetails({storyIds: missingStoryIds}),
          ).unwrap();
          detailRes = [...existingStories, ...fetchedStories];
        } catch (error) {
          console.error('Error fetching missing stories:', error);
          // Continue with existing stories if fetch fails
          detailRes = existingStories;
        }
      }
    }

    const seenedStories = await Promise.all(
      detailRes.map(async (item: any) => {
        try {
          await dispatch(seenStory({storyId: item._id}));

          // ✅ Chỉ check seen status cho stories không phải từ Archive
          if (!isOwner) {
            const hasSeen = await checkStorySeenInStorage(
              item._id,
              item.createdAt,
            );
            if (!hasSeen) {
              await markStoryAsSeen(item._id, item.createdAt);
            }
          }

          // ✅ Giữ nguyên cấu trúc tags gốc để tránh lỗi navigation
          const populatedTags = (item.tags || []).map((tag: any) => {
            // Giữ nguyên cấu trúc gốc, chỉ thêm thông tin nếu cần
            return {
              ...tag,
              // Đảm bảo user field vẫn là string ID như gốc
              user:
                typeof tag.user === 'string'
                  ? tag.user
                  : tag.user?._id || tag.user,
            };
          });

          const processedStory = {
            ...item,
            tags: populatedTags,
            uriVideo: item.mediaUrl?.endsWith('.mp4') ? item.mediaUrl : null,
            image:
              item.mediaUrl?.endsWith('.jpg') || item.mediaUrl?.endsWith('.png')
                ? item.mediaUrl
                : null,
          };

          // ✅ Đảm bảo data được lưu trữ trong Redux state
          const state = store.getState();
          const existingIndex = state.stories.storyDetails.findIndex(
            s => s._id === item._id,
          );

          if (existingIndex !== -1) {
            // Update existing story in Redux state
            store.dispatch({
              type: 'stories/fetchStoryDetails/fulfilled',
              payload: [processedStory],
            });
          } else {
            // Add new story to Redux state
            store.dispatch({
              type: 'stories/fetchStoryDetails/fulfilled',
              payload: [processedStory],
            });
          }

          return processedStory;
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

    const creator = {
      username: viewerUser?.username, // ✅ Sửa: dùng username thay vì handleName
      handleName: viewerUser?.handleName, // ✅ Thêm handleName để xử lý logic
      profilePic: viewerUser?.profilePic,
      _id: viewerUser?._id,
    };

    // ✅ Tạo story groups từ tất cả highlights (sắp xếp theo thứ tự mới nhất)
    const storyGroups = (highlightStories ? [...highlightStories] : [])
      .sort((a: any, b: any) => {
        // Sắp xếp theo createdAt, mới nhất lên đầu (giống component)
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      })
      .filter(
        (highlight: any) => highlight.storyId && highlight.storyId.length > 0,
      )
      .map((highlight: any) => ({
        creator,
        stories: [], // Sẽ được load sau
        highlightId: highlight._id,
        collectionName: highlight.collectionName,
        thumbnail: highlight.thumbnail,
      }));

    // Tìm index của highlight hiện tại
    const currentHighlightIndex = storyGroups.findIndex(
      (group: any) => group.highlightId === story._id,
    );

    if (currentHighlightIndex === -1) {
      // ✅ Nếu không tìm thấy, chỉ hiển thị highlight hiện tại - sử dụng unified SeenStory
      navigation.navigate('SeenStory', {
        storyGroups: [
          {
            creator,
            stories: validStories,
          },
        ],
        storyGroupIndex: 0,
        creator,
        stories: validStories,
        fromArchive: true, // ✅ Highlights are archive-like: always bypass 24h filtering
        timestamp: Date.now(),
      });
      return;
    }

    // Load stories cho tất cả highlights
    const allHighlightStories = await Promise.all(
      storyGroups.map(async (group: any, index: number) => {
        if (index === currentHighlightIndex) {
          // Highlight hiện tại đã có stories
          return {
            ...group,
            stories: validStories,
          };
        }

        // Load stories cho các highlight khác
        try {
          // Tìm highlight tương ứng để lấy storyId
          const currentHighlight = highlightStories?.find(
            (h: Story) => h._id === group.highlightId,
          );
          if (
            !currentHighlight?.storyId ||
            currentHighlight.storyId.length === 0
          ) {
            return {
              ...group,
              stories: [],
            };
          }

          // Lấy story details từ Redux state trước (đã được pre-load)
          const state = store.getState();
          const existingStoryDetails = state.stories.storyDetails || [];

          // Tìm stories đã có trong state
          const existingStories = (currentHighlight.storyId || [])
            .map((storyId: string) =>
              existingStoryDetails.find((s: Story) => s._id === storyId),
            )
            .filter(Boolean);

          // Nếu chưa có đủ stories trong state, fetch thêm
          let highlightDetailRes = existingStories;
          if (
            existingStories.length < (currentHighlight.storyId || []).length
          ) {
            const missingStoryIds = (currentHighlight.storyId || []).filter(
              (storyId: string) =>
                !existingStories.find(s => s?._id === storyId),
            );

            if (missingStoryIds.length > 0) {
              try {
                const fetchedStories = await dispatch(
                  fetchStoryDetails({storyIds: missingStoryIds}),
                ).unwrap();
                highlightDetailRes = [...existingStories, ...fetchedStories];
              } catch (error) {
                console.error('Error fetching highlight stories:', error);
                // Continue with existing stories if fetch fails
                highlightDetailRes = existingStories;
              }
            }
          }

          const loadedStories = await Promise.all(
            highlightDetailRes
              .filter((item): item is Story => item !== undefined)
              .map(async (item: Story) => {
                try {
                  await dispatch(seenStory({storyId: item._id}));

                  // ✅ Chỉ check seen status cho stories không phải từ Archive
                  if (!isOwner) {
                    const hasSeen = await checkStorySeenInStorage(
                      item._id,
                      item.createdAt,
                    );
                    if (!hasSeen) {
                      await markStoryAsSeen(item._id, item.createdAt);
                    }
                  }

                  // ✅ Giữ nguyên cấu trúc tags gốc cho các highlight khác
                  const populatedTags = (item.tags || []).map(
                    (tag: {
                      user: UserMini;
                      position: {
                        x: number;
                        y: number;
                      };
                    }) => {
                      // Giữ nguyên cấu trúc gốc, chỉ đảm bảo user field là string ID
                      return {
                        ...tag,
                        // Đảm bảo user field vẫn là string ID như gốc
                        user:
                          typeof tag.user === 'string'
                            ? tag.user
                            : tag.user?._id || tag.user,
                      };
                    },
                  );

                  const processedStory = {
                    ...item,
                    tags: populatedTags,
                    uriVideo: item.mediaUrl?.endsWith('.mp4')
                      ? item.mediaUrl
                      : null,
                    image:
                      item.mediaUrl?.endsWith('.jpg') ||
                      item.mediaUrl?.endsWith('.png')
                        ? item.mediaUrl
                        : null,
                  };

                  // ✅ Đảm bảo data được lưu trữ trong Redux state cho các highlight khác
                  const state = store.getState();
                  const existingIndex = state.stories.storyDetails.findIndex(
                    (s: Story) => s._id === item._id,
                  );

                  if (existingIndex !== -1) {
                    // Update existing story in Redux state
                    store.dispatch({
                      type: 'stories/fetchStoryDetails/fulfilled',
                      payload: [processedStory],
                    });
                  } else {
                    // Add new story to Redux state
                    store.dispatch({
                      type: 'stories/fetchStoryDetails/fulfilled',
                      payload: [processedStory],
                    });
                  }

                  return processedStory;
                } catch (err) {
                  console.error('seenStory error', err);
                  return null;
                }
              }),
          );

          return {
            ...group,
            stories: loadedStories.filter(s => s),
          };
        } catch (error) {
          console.error('Error loading highlight stories:', error);
          return {
            ...group,
            stories: [],
          };
        }
      }),
    );

    // Lọc ra các groups có stories
    const validStoryGroups = allHighlightStories.filter(
      group => group.stories.length > 0,
    );

    const currentGroupIndex = validStoryGroups.findIndex(
      group => group.highlightId === story._id,
    );

    // ✅ Đảm bảo tất cả stories được lưu trữ trong Redux state trước khi navigate
    const allStories = validStoryGroups.flatMap(group => group.stories);
    allStories.forEach(story => {
      const state = store.getState();
      const existingIndex = state.stories.storyDetails.findIndex(
        (s: Story) => s._id === story._id,
      );

      if (existingIndex === -1) {
        // Add new story to Redux state
        store.dispatch({
          type: 'stories/fetchStoryDetails/fulfilled',
          payload: [story],
        });
      }
    });

    // ✅ Sử dụng unified SeenStory component cho cả owner và viewer
    navigation.navigate('SeenStory', {
      storyGroups: validStoryGroups,
      storyGroupIndex: currentGroupIndex >= 0 ? currentGroupIndex : 0,
      creator,
      stories: validStories,
      fromArchive: true, // ✅ Highlights are archive-like: always bypass 24h filtering
      timestamp: Date.now(),
    });
  } catch (error) {
    GlobalAlertManager.show('Thất bại', 'Lỗi khi tải highlight');
  }
};

export const handleDeleteMyPost = ({
  showAlert,
  dispatch,
  postId,
  setDeleteMyPost,
}: {
  postId: string;
  showAlert: any;
  dispatch: AppDispatch;
  setDeleteMyPost?: (postId: string) => void;
}) => {
  GlobalAlertManager.show(
    'Thông báo',
    'Bạn có chắc chắn muốn xóa bài viết này không?',
    async () => {
      try {
        await dispatch(DeleteMyPost({postIds: [postId]}))
          .unwrap()
          .then(() => {
            if (setDeleteMyPost) setDeleteMyPost(postId);
            showAlert('Thành công', 'Xóa bài đăng thành công');
          });
      } catch (error) {
        showAlert('Thất bại', 'Xóa bài đăng thất bại.');
      }
    },
  );
};
