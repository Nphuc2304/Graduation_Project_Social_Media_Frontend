import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {
  toggleLikeStory,
  deleteStory,
  fetchFollowingStories,
  fetchStoryDetails,
  seenStory,
} from '../../../services/StoryRedux/StorySlice';
import {getPublicProfile} from '../../../services/userRedux/userSlice';
import {styles} from './components/styles';
import {Header} from './components/Header';
import {ProgressBar} from './components/ProgressBar';
import {MediaPlayer} from './components/MediaPlayer';
import {Footer} from './components/Footer';
import {Keyboard} from 'react-native';
import ModalReplyStory, {ModalReplyHandle} from './components/ModalReplyStory';
import StoryLoadingSkeleton from '../../(tabs)/Home/components/StoryLoadingSkeleton';
import {debugStoryGroups} from '../../(tabs)/Home/util';
import {renderTextWithMentions} from '../../util/storyTextRenderer';
import {Story} from '@services/StoryRedux/StoryType';
import {VideoRef} from 'react-native-video';
import {GestureResponderEvent} from 'react-native-modal';
import {Portal} from 'react-native-portalize';
import {useHeadAlert} from '../../../components/Global/HeadAlertProvider';
import {DraggableCaption} from '../../../components/DraggableCaption';
import Clipboard from '@react-native-clipboard/clipboard';


// Import owner-specific components
import ModelPeopleSeen from './componentStoryOwner/ModelPeopleSeen';
import SeenStoryOwnerBottom from './componentStoryOwner/BottomBar';
import ModalSeeMore from './componentStoryOwner/ModelSeeMore';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export const SeenStory = ({route, navigation}: any) => {
  const {
    creator,
    stories: routeStories = [],
    storyGroups = [],
    storyGroupIndex = 0,
    isLoading = false,
    storyId,
    creatorId,
  } = route.params || {};

  // ✅ State để handle loading và update params
  const [stories, setStories] = useState(routeStories);
  const [currentStoryGroups, setCurrentStoryGroups] = useState(storyGroups);
  const [currentCreator, setCurrentCreator] = useState(creator);
  const [isDataLoading, setIsDataLoading] = useState(isLoading);

  const [currentIndex, setCurrentIndex] = useState(
    route.params?.initialIndex || 0,
  );
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [musicDuration, setMusicDuration] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaSize, setMediaSize] = useState({width: 0, height: 0});
  const progressAnims = useRef<Animated.Value[]>(
    stories.map(() => new Animated.Value(0)),
  ).current;
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user.user);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMusicLoaded, setIsMusicLoaded] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const replyModalRef = useRef<ModalReplyHandle>(null);
  const yourUserId = useSelector((state: RootState) => state.user.user?._id);

  // ✅ Get story details from Redux store
  const {storyDetails, followingUsers} = useSelector(
    (state: RootState) => state.stories,
  );

  // ✅ Owner-specific states
  const [visible, setVisible] = useState(false);
  const [visibleSeeMore, setVisibleSeeMore] = useState(false);
  const [isNavigatedAway, setIsNavigatedAway] = useState(false);
  const [wasPausedByUser, setWasPausedByUser] = useState(false);
  const progressValues = useRef<number[]>(stories.map(() => 0)).current;
  const isNavigatingRef = useRef(false);

  // ✅ Hook để hiển thị thông báo nhẹ
  const {showAlert} = useHeadAlert();

  // ✅ Check if current user is the story owner
  const isCurrentUserStory =
    currentCreator?.handleName === user?.handleName ||
    currentCreator?._id === user?._id;

  // ✅ Handle deeplink navigation
  useEffect(() => {
    if (storyId && creatorId && !stories.length) {


      // Handle deeplink navigation - fetch story data
      const handleDeeplinkStory = async () => {
        try {
          setIsDataLoading(true);
          

          // Fetch story details
          const storyDetails = await dispatch(
            fetchStoryDetails({storyIds: [storyId]}),
          ).unwrap();

      

          if (storyDetails.length > 0) {
            const story = storyDetails[0];
      

  

            // Fetch creator information - first try to find in following users
            let creatorInfo = followingUsers.find(u => u._id === creatorId);
         

            // If not found in following users, fetch from public profile API
            if (!creatorInfo) {
              try {
                
                const publicProfileResponse = await dispatch(
                  getPublicProfile({userId: creatorId}),
                ).unwrap();
                
                creatorInfo = {
                  _id: creatorId, // Use the creatorId from params
                  username: publicProfileResponse.username,
                  handleName: publicProfileResponse.handleName,
                  profilePic: publicProfileResponse.profilePic,
                  stories: [], // Empty stories array since we don't have following data
                };
               
              } catch (error) {
               
                showAlert('Lỗi', 'Không tìm thấy người dùng này');
                navigation.goBack();
                return;
              }
            }

            if (creatorInfo) {
              setCurrentCreator({
                username: creatorInfo.username,
                handleName: creatorInfo.handleName,
                profilePic: creatorInfo.profilePic,
                _id: creatorInfo._id,
              });

              setStories([story]);
              setCurrentStoryGroups([
                {
                  creator: creatorInfo,
                  stories: [story],
                },
              ]);

        

              // Mark story as seen
              await dispatch(seenStory({storyId}));
            } else {
             
              // If creator not found in following users, show error
              showAlert('Lỗi', 'Không tìm thấy người dùng này');
              navigation.goBack();
            }
          } else {
          
            showAlert('Thông báo', 'Story này không còn tồn tại hoặc đã bị xóa.');
            navigation.goBack();
          }
        } catch (error) {
          
          // ✅ Kiểm tra loại lỗi để hiển thị thông báo phù hợp
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status === 404) {
              showAlert('Thông báo', 'Story này không còn tồn tại hoặc đã bị xóa.');
            } else {
              showAlert('Lỗi', 'Không thể tải story. Vui lòng thử lại sau.');
            }
          } else {
            showAlert('Lỗi', 'Không thể tải story. Vui lòng thử lại sau.');
          }
          navigation.goBack();
        } finally {
          setIsDataLoading(false);

        }
      };

      handleDeeplinkStory();
    }
  }, [
    storyId,
    creatorId,
    stories.length,
    dispatch,
    followingUsers,
    navigation,
    showAlert,
    getPublicProfile,
  ]);

  // ✅ Sync stories with Redux store data and filter out deleted stories
  const syncedStories = useMemo(() => {
    // ✅ Get current user's stories from Redux store to check for deletions
    const currentUserInRedux = followingUsers.find(
      u =>
        u._id === currentCreator?._id ||
        u.handleName === currentCreator?.handleName,
    );

    // ✅ For stories passed via route params (including deeplink and archive), don't filter by validStoryIds
    // because stories older than 24h may not be in followingUsers.stories but still exist in database
    let filteredStories = stories;
    
    // ✅ Only filter by validStoryIds if we're viewing from Home feed (not deeplink, not archive)
    // Archive stories and deeplink stories should be viewable regardless of 24h limit
    if (!storyId && !creatorId && !route.params?.fromArchive) {
      const validStoryIds = currentUserInRedux?.stories || [];
      filteredStories = stories.filter((story: Story) =>
        validStoryIds.includes(story._id),
      );
    }

    // ✅ In highlight/archive mode, remove stories that were deleted on server
    // We detect deletion when the story no longer exists in storyDetails store
    if (route.params?.fromArchive) {
      const existingStoryIds = new Set(storyDetails.map(s => s._id));
      filteredStories = filteredStories.filter((story: Story) =>
        existingStoryIds.has(story._id),
      );
    }

    // ✅ Use filtered stories directly without expiration check
    const visibleStories = filteredStories;

    return visibleStories.map((story: Story) => {
      // Find updated story data from Redux store
      const updatedStory = storyDetails.find(s => s._id === story._id);
      if (updatedStory) {
        // Merge with existing story data, prioritizing Redux data for like status
        return {
          ...story,
          likedByUsers: updatedStory.likedByUsers || story.likedByUsers || [],
          viewedByUsers:
            updatedStory.viewedByUsers || story.viewedByUsers || [],
          // Keep other properties from original story
        };
      }
      return story;
    });
  }, [stories, storyDetails, followingUsers, currentCreator, storyId, creatorId]);

  // ✅ Update local state when syncedStories changes (due to deletions)
  useEffect(() => {
    if (syncedStories.length !== stories.length) {
      setStories(syncedStories);

      // ✅ Update storyGroups to reflect deletions
      const updatedStoryGroups = [...currentStoryGroups];
      updatedStoryGroups[storyGroupIndex] = {
        ...currentStoryGroups[storyGroupIndex],
        stories: syncedStories,
      };
      setCurrentStoryGroups(updatedStoryGroups);

      // ✅ Stop current animation before adjusting index
      stopCurrentAnimation();

      // ✅ Adjust currentIndex if needed
      if (currentIndex >= syncedStories.length && syncedStories.length > 0) {
        setCurrentIndex(syncedStories.length - 1);
      }

      // ✅ Reset progress animations for remaining stories
      progressAnims.forEach((anim, index) => {
        if (index < currentIndex) {
          anim.setValue(1); // Completed stories
        } else {
          anim.setValue(0); // Future stories
        }
      });

      // ✅ Reset pause state when story is deleted and index changes
      if (isCurrentUserStory && syncedStories.length > 0) {
        setIsPaused(false);
        setWasPausedByUser(false);
      }

      // ✅ If no stories left, go back
      if (syncedStories.length === 0) {
        // Check if all stories were filtered out due to expiration or deletion
        const originalStoriesCount = stories.length;
        const filteredStoriesCount = originalStoriesCount - syncedStories.length;
        
        if (filteredStoriesCount > 0) {
          // ✅ Kiểm tra xem story có bị xóa
          const currentUserInRedux = followingUsers.find(
            u =>
              u._id === currentCreator?._id ||
              u.handleName === currentCreator?.handleName,
          );
          
          // ✅ Only show deletion message if we're not in deeplink mode, not archive mode, and stories were actually deleted
          if (!storyId && !creatorId && !route.params?.fromArchive && currentUserInRedux && currentUserInRedux.stories.length === 0) {
            // Story bị xóa
            showAlert(
              'Thông báo', 
              'Story này không còn tồn tại hoặc đã bị xóa.',
              2000
            );
          }
        }
        
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      }
    }
  }, [
    syncedStories.length,
    stories.length,
    currentIndex,
    storyGroupIndex,
    currentStoryGroups,
    navigation,
    isCurrentUserStory,
  ]);

  // ✅ Listen for parameter updates and navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = route.params;
      if (params) {
        setStories(params.stories || []);
        setCurrentStoryGroups(params.storyGroups || []);
        setCurrentCreator(params.creator || {});
        setIsDataLoading(params.isLoading || false);
      }

      // ✅ Reset navigated away state khi quay lại
      setIsNavigatedAway(false);

      // ✅ Resume story khi quay lại từ profile
      if (isPaused) {
        setIsPaused(false);
      }

      // ✅ Force refresh following stories to get latest data (including deletions)
      if (isCurrentUserStory) {
        dispatch(fetchFollowingStories({page: 1}));
      }
    });

    // ✅ Listen for blur event (khi navigate away)
    const blurUnsubscribe = navigation.addListener('blur', () => {
      // ✅ Set navigated away state
      setIsNavigatedAway(true);

      // Pause story khi navigate away
      if (!isPaused) {
        setIsPaused(true);
      }
    });

    return () => {
      unsubscribe();
      blurUnsubscribe();
    };
  }, [navigation, route.params, isPaused, isCurrentUserStory, dispatch]);

  // ✅ Reset video và music khi navigate away và quay lại (owner mode)
  useEffect(() => {
    if (isCurrentUserStory && isNavigatedAway) {
      // Khi navigate away, pause cả video và music
      setIsPaused(true);
    } else if (isCurrentUserStory && !isNavigatedAway) {
      // Khi quay lại, resume nếu trước đó không bị pause bởi user
      if (!wasPausedByUser) {
        setIsPaused(false);
      }
    }
  }, [isNavigatedAway, wasPausedByUser, isCurrentUserStory]);

  // ✅ Update progress anims when syncedStories change (including deletions)
  useEffect(() => {
    if (syncedStories.length !== progressAnims.length) {
      progressAnims.splice(0, progressAnims.length);
      progressAnims.push(...syncedStories.map(() => new Animated.Value(0)));
      if (isCurrentUserStory) {
        progressValues.splice(0, progressValues.length);
        progressValues.push(...syncedStories.map(() => 0));
      }
    }
  }, [syncedStories.length, isCurrentUserStory]);

  // ✅ Reset progress values when currentIndex changes due to story deletion
  useEffect(() => {
    if (isCurrentUserStory && progressValues.length > currentIndex) {
      // Reset progress for current and future stories when index changes
      for (let i = currentIndex; i < progressValues.length; i++) {
        progressValues[i] = 0;
      }
    }
  }, [currentIndex, isCurrentUserStory]);

  // ✅ Reset progress bar when currentIndex changes (due to story deletion)
  useEffect(() => {
    // ✅ Ensure progressAnims length matches syncedStories length
    if (progressAnims.length !== syncedStories.length) {
      return; // Let the other useEffect handle this
    }

    progressAnims.forEach((anim, index) => {
      if (index < currentIndex && index < syncedStories.length) {
        anim.setValue(1); // Completed stories
      } else if (index > currentIndex) {
        anim.setValue(0); // Future stories
      }
    });
  }, [currentIndex, syncedStories.length, progressAnims.length]);

  const selectedItem = useMemo(() => {
    const item = syncedStories[currentIndex];
    if (!item) {
  
      return null;
    }
    return item;
  }, [syncedStories, currentIndex]);

  useEffect(() => {
    const hasVideo = !!selectedItem?.uriVideo;
    const hasMusic = !!selectedItem?.music?.link;

    if ((hasVideo && !isVideoLoaded) || (hasMusic && !isMusicLoaded)) {
      return;
    }

    setIsMediaLoading(false);
    if (!isPaused) {
      startProgressAnimation();
    }
  }, [isVideoLoaded, isMusicLoaded]);

  const imageDuration = 15000;

  const getItemDuration = () => {
    if (selectedItem?.uriVideo && videoDuration) {
      return videoDuration * 1000;
    }

    if (!selectedItem?.uriVideo && selectedItem?.music?.link && musicDuration) {
      return imageDuration;
    }

    return imageDuration;
  };

  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<VideoRef>(null);

  // ✅ Owner-specific: Delete story functionality
  const handleDeleteStory = async () => {
    try {
      const currentStory = syncedStories[currentIndex];
      if (!currentStory?._id) return;

      // ✅ Tắt modal ngay lập tức
      setVisibleSeeMore(false);

      // ✅ Reset pause state immediately when deleting
      setIsPaused(false);
      setWasPausedByUser(false);

      // Xóa story từ server (Redux store sẽ tự động cập nhật)
      await dispatch(deleteStory({storyId: currentStory._id})).unwrap();

      // ✅ Hiển thị thông báo nhẹ thành công trong 1.5s
      showAlert('Thông báo', 'Tin của bạn đã được xoá', 2000);
    } catch (error) {
      // ✅ Hiển thị thông báo lỗi nhẹ
      showAlert('Thất bại', 'Không thể xoá story', 2000);
      // ✅ Đóng modal nếu có lỗi
      setVisibleSeeMore(false);
    }
  };

  // ✅ Owner-specific: Progress animation with tracking
  const startProgressAnimation = (forceRestart = false) => {
    // Don't start animation if story is paused (modal is open)
    if (isPaused) return;

    if (isCurrentUserStory) {
      // Owner mode: Use tracking progress
      if (animationRef.current) {
        animationRef.current.stop();
      }

      const anim = progressAnims[currentIndex];
      if (!anim) return;

      // ✅ Ensure progressValues array is properly sized
      if (progressValues.length <= currentIndex) {
        progressValues[currentIndex] = 0;
      }

      // Nếu reset thì đặt lại
      if (forceRestart || progressValues[currentIndex] >= 1) {
        anim.setValue(0);
        progressValues[currentIndex] = 0;
      }

      const remainingDuration =
        (1 - progressValues[currentIndex]) * getItemDuration();

      animationRef.current = Animated.timing(anim, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      // Theo dõi giá trị tiến độ để cập nhật lại `progressValues`
      const listenerId = anim.addListener(({value}) => {
        progressValues[currentIndex] = value;
      });

      animationRef.current.start(({finished}) => {
        anim.removeListener(listenerId);
        if (finished) {
          progressValues[currentIndex] = 1;
          goToNextStory();
        }
      });
    } else {
      // Viewer mode: Use simple animation
      animationRef.current?.stop();

      const anim = progressAnims[currentIndex];
      if (!anim) return;

      // ⚠️ Chỉ reset nếu anim đang ở 0
      anim.stopAnimation(value => {
        if (value === 0 || value >= 1) {
          anim.setValue(0);
        }

        const duration = getItemDuration() * (1 - value); // phần còn lại

        animationRef.current = Animated.timing(anim, {
          toValue: 1,
          duration,
          useNativeDriver: false,
        });

        animationRef.current.start(({finished}) => {
          if (finished) goToNextStory();
        });
      });
    }
  };

  const stopCurrentAnimation = () => {
    animationRef.current?.stop();
    animationRef.current = null;
  };

  // ✅ Owner-specific: Enhanced navigation with tracking
  const goToNextStory = () => {
    if (isCurrentUserStory && isNavigatingRef.current) return;
    if (isCurrentUserStory) {
      isNavigatingRef.current = true;
    }

    stopCurrentAnimation();

    if (currentIndex < syncedStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      if (isCurrentUserStory) {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 300);
      }
    } else {
      const nextGroupIndex = storyGroupIndex + 1;

      if (nextGroupIndex < currentStoryGroups.length) {
        const nextGroup = currentStoryGroups[nextGroupIndex];

        debugStoryGroups(
          currentStoryGroups,
          nextGroupIndex,
          'Navigation: Next Group',
        );

        // ✅ Check if next group belongs to current user
        const isOwner =
          nextGroup.creator?.handleName === user?.handleName ||
          nextGroup.creator?._id === user?._id;
        const routeName = isOwner ? 'SeenStory' : 'SeenStory'; // Use unified component

                  // ✅ Sync next group stories with Redux store
          const nextUserInRedux = followingUsers.find(
            u =>
              u._id === nextGroup.creator?._id ||
              u.handleName === nextGroup.creator?.handleName,
          );

          // ✅ Don't filter by validStoryIds for navigation - use all stories from storyGroups
          const syncedNextGroupStories = nextGroup.stories
            .map((story: Story) => {
              const updatedStory = storyDetails.find(s => s._id === story._id);
              if (updatedStory) {
                return {
                  ...story,
                  likedByUsers:
                    updatedStory.likedByUsers || story.likedByUsers || [],
                  viewedByUsers:
                    updatedStory.viewedByUsers || story.viewedByUsers || [],
                };
              }
              return story;
            });

                  // ✅ Check if there are any stories in the next group (don't filter by 24h)
          if (nextGroup.stories.length === 0) {
          
            
            // ✅ Kiểm tra xem story có bị xóa (chỉ khi không phải deeplink mode và không phải archive mode)
            const nextUserInRedux = followingUsers.find(
              u =>
                u._id === nextGroup.creator?._id ||
                u.handleName === nextGroup.creator?.handleName,
            );
            
            if (!storyId && !creatorId && !route.params?.fromArchive && nextUserInRedux && nextUserInRedux.stories.length === 0) {
              // Story bị xóa - hiển thị thông báo
              showAlert(
                'Thông báo', 
                'Story tiếp theo không còn tồn tại hoặc đã bị xóa.',
                2000
              );
            }
            
            // Try to find the next group with visible stories
            let nextVisibleGroupIndex = nextGroupIndex + 1;
            while (nextVisibleGroupIndex < currentStoryGroups.length) {
              const nextVisibleGroup = currentStoryGroups[nextVisibleGroupIndex];
              
              // ✅ Don't filter by validStoryIds - use all stories from storyGroups
              const visibleStoriesInNextGroup = nextVisibleGroup.stories;
              
              if (visibleStoriesInNextGroup.length > 0) {
                // Navigate to this group instead
                const isOwnerNext =
                  nextVisibleGroup.creator?.handleName === user?.handleName ||
                  nextVisibleGroup.creator?._id === user?._id;
                const routeNameNext = isOwnerNext ? 'SeenStory' : 'SeenStory';
                
                const syncedNextVisibleGroupStories = visibleStoriesInNextGroup.map((story: Story) => {
                  const updatedStory = storyDetails.find(s => s._id === story._id);
                  if (updatedStory) {
                    return {
                      ...story,
                      likedByUsers:
                        updatedStory.likedByUsers || story.likedByUsers || [],
                      viewedByUsers:
                        updatedStory.viewedByUsers || story.viewedByUsers || [],
                    };
                  }
                  return story;
                });

                const updatedStoryGroupsNext = [...currentStoryGroups];
                updatedStoryGroupsNext[nextVisibleGroupIndex] = {
                  ...nextVisibleGroup,
                  stories: syncedNextVisibleGroupStories,
                };

                navigation.replace(routeNameNext, {
                  storyGroups: updatedStoryGroupsNext,
                  storyGroupIndex: nextVisibleGroupIndex,
                  creator: nextVisibleGroup.creator,
                  stories: syncedNextVisibleGroupStories,
                  initialIndex: 0,
                  fromArchive: route.params?.fromArchive, // ✅ Truyền flag từ Archive
                  timestamp: Date.now(),
                });
                return;
              }
              nextVisibleGroupIndex++;
            }
            
            // If no visible stories found in any next groups, go back
            navigation.goBack();
            return;
          }

        // ✅ Update storyGroups with synced data
        const updatedStoryGroups = [...currentStoryGroups];
        updatedStoryGroups[nextGroupIndex] = {
          ...nextGroup,
          stories: syncedNextGroupStories,
        };

        navigation.replace(routeName, {
          storyGroups: updatedStoryGroups,
          storyGroupIndex: nextGroupIndex,
          creator: nextGroup.creator,
          stories: syncedNextGroupStories,
          initialIndex: 0,
          fromArchive: route.params?.fromArchive, // ✅ Truyền flag từ Archive
          timestamp: Date.now(),
        });
      } else {
        navigation.goBack();
      }
    }
  };

  // ✅ Owner-specific: Enhanced previous navigation
  const goToPreviousStory = () => {
    if (isCurrentUserStory && isNavigatingRef.current) return;
    if (isCurrentUserStory) {
      isNavigatingRef.current = true;
    }

    stopCurrentAnimation();

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (isCurrentUserStory) {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 300);
      }
    } else {
      let prevGroupIndex = storyGroupIndex - 1;

      // ✅ Tìm previous group có stories
      while (prevGroupIndex >= 0) {
        const prevGroup = currentStoryGroups[prevGroupIndex];

        if (prevGroup?.stories?.length > 0) {
          debugStoryGroups(
            currentStoryGroups,
            prevGroupIndex,
            'Navigation: Previous Group',
          );

          // ✅ Check ownership properly
          const isOwner =
            prevGroup.creator?.handleName === user?.handleName ||
            prevGroup.creator?._id === user?._id;
          const routeName = isOwner ? 'SeenStory' : 'SeenStory'; // Use unified component

          // ✅ Sync previous group stories with Redux store
          const prevUserInRedux = followingUsers.find(
            u =>
              u._id === prevGroup.creator?._id ||
              u.handleName === prevGroup.creator?.handleName,
          );

          // ✅ Don't filter by validStoryIds for navigation - use all stories from storyGroups
          const syncedPrevGroupStories = prevGroup.stories
            .map((story: Story) => {
              const updatedStory = storyDetails.find(s => s._id === story._id);
              if (updatedStory) {
                return {
                  ...story,
                  likedByUsers:
                    updatedStory.likedByUsers || story.likedByUsers || [],
                  viewedByUsers:
                    updatedStory.viewedByUsers || story.viewedByUsers || [],
                };
              }
              return story;
            });

          // ✅ Check if there are any stories in the previous group (don't filter by 24h)
          if (prevGroup.stories.length === 0) {
           
            
            // ✅ Kiểm tra xem story có bị xóa (chỉ khi không phải deeplink mode và không phải archive mode)
            const prevUserInRedux = followingUsers.find(
              u =>
                u._id === prevGroup.creator?._id ||
                u.handleName === prevGroup.creator?.handleName,
            );
            
            if (!storyId && !creatorId && !route.params?.fromArchive && prevUserInRedux && prevUserInRedux.stories.length === 0) {
              // Story bị xóa - hiển thị thông báo
              showAlert(
                'Thông báo', 
                'Story trước đó không còn tồn tại hoặc đã bị xóa.',
                2000
              );
            }
            
            // Try to find the previous group with visible stories
            let prevVisibleGroupIndex = prevGroupIndex - 1;
            while (prevVisibleGroupIndex >= 0) {
              const prevVisibleGroup = currentStoryGroups[prevVisibleGroupIndex];
              
              // ✅ Don't filter by validStoryIds - use all stories from storyGroups
              const visibleStoriesInPrevGroup = prevVisibleGroup.stories;
              
              if (visibleStoriesInPrevGroup.length > 0) {
                // Navigate to this group instead
                const isOwnerPrev =
                  prevVisibleGroup.creator?.handleName === user?.handleName ||
                  prevVisibleGroup.creator?._id === user?._id;
                const routeNamePrev = isOwnerPrev ? 'SeenStory' : 'SeenStory';
                
                const syncedPrevVisibleGroupStories = visibleStoriesInPrevGroup.map((story: Story) => {
                  const updatedStory = storyDetails.find(s => s._id === story._id);
                  if (updatedStory) {
                    return {
                      ...story,
                      likedByUsers:
                        updatedStory.likedByUsers || story.likedByUsers || [],
                      viewedByUsers:
                        updatedStory.viewedByUsers || story.viewedByUsers || [],
                    };
                  }
                  return story;
                });

                const updatedStoryGroupsPrev = [...currentStoryGroups];
                updatedStoryGroupsPrev[prevVisibleGroupIndex] = {
                  ...prevVisibleGroup,
                  stories: syncedPrevVisibleGroupStories,
                };

                navigation.replace(routeNamePrev, {
                  storyGroups: updatedStoryGroupsPrev,
                  storyGroupIndex: prevVisibleGroupIndex,
                  creator: prevVisibleGroup.creator,
                  stories: syncedPrevVisibleGroupStories,
                  initialIndex: (syncedPrevVisibleGroupStories.length || 1) - 1,
                  fromArchive: route.params?.fromArchive, // ✅ Truyền flag từ Archive
                  timestamp: Date.now(),
                });
                return;
              }
              prevVisibleGroupIndex--;
            }
            
            // If no visible stories found in any previous groups, go back
            navigation.goBack();
            return;
          }

          // ✅ Update storyGroups with synced data
          const updatedStoryGroups = [...currentStoryGroups];
          updatedStoryGroups[prevGroupIndex] = {
            ...prevGroup,
            stories: syncedPrevGroupStories,
          };

          navigation.replace(routeName, {
            storyGroups: updatedStoryGroups,
            storyGroupIndex: prevGroupIndex,
            creator: prevGroup.creator,
            stories: syncedPrevGroupStories,
            initialIndex: (syncedPrevGroupStories.length || 1) - 1,
            fromArchive: route.params?.fromArchive, // ✅ Truyền flag từ Archive
            timestamp: Date.now(),
          });

          return;
        }

        prevGroupIndex--;
      }

      navigation.goBack();
    }
  };

  // ✅ Owner-specific: Enhanced pause toggle
  const togglePause = () => {
    if (isCurrentUserStory) {
      setIsPaused(prev => {
        const newState = !prev;
        // ✅ Track khi user pause/resume
        setWasPausedByUser(newState);

        if (newState) {
          animationRef.current?.stop();
        } else {
          startProgressAnimation();
        }
        return newState;
      });
    } else {
      setIsPaused(prev => !prev);
    }
  };

  // mute
  const toggleMute = () => setIsMuted(prev => !prev);

  const handleTouch = (event: GestureResponderEvent) => {
    const {locationX} = event.nativeEvent;
    if (locationX < screenWidth / 3) goToPreviousStory();
    else if (locationX > (screenWidth * 2) / 3) goToNextStory();
  };

  // ✅ Viewer-specific: Like functionality
  const handleLike = async () => {
    if (isCurrentUserStory) return; // Owner can't like their own story



    try {
      await dispatch(toggleLikeStory({storyId: selectedItem._id})).unwrap();

      // ✅ Update local state immediately for better UX
      setIsLiked(prev => !prev);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
    
      
      // ✅ Kiểm tra loại lỗi để hiển thị thông báo phù hợp
      if (err && typeof err === 'object' && 'status' in err) {
        const status = (err as any).status;
        if (status === 404) {
          showAlert('Thông báo', 'Story này không còn tồn tại hoặc đã bị xóa.');
        } else {
          showAlert('Lỗi', 'Không thể thích story. Vui lòng thử lại sau.');
        }
      } else {
        showAlert('Lỗi', 'Không thể thích story. Vui lòng thử lại sau.');
      }
    }
  };

  const renderCaption = () => {
    const content = selectedItem?.content;
    const tags = selectedItem?.tags;

    // ✅ Normalize tags: backend may send either { user: UserMini } or { user: string, handleName/username }
    const normalizedMentionData = (tags || [])
      .map((tag: any) => {
        if (!tag || typeof tag !== 'object') return null;
        const originalUser = typeof tag.user === 'object' ? tag.user : undefined;
        const userId = originalUser?._id || (typeof tag.user === 'string' ? tag.user : undefined);
        const originalUsername = originalUser?.username || tag?.username;
        const originalHandleName = originalUser?.handleName || tag?.handleName;
        if (!userId) return null;

        const latest = followingUsers.find(u => u._id === userId);
        const latestUsername = latest?.username || originalUsername;
        const latestHandleName = latest?.handleName || originalHandleName;
        const aliases = Array.from(
          new Set([
            originalUsername || '',
            originalHandleName || '',
          ].filter(Boolean))
        );

        return {
          _id: userId,
          username: latestUsername,
          handleName: latestHandleName,
          aliases,
        };
      })
      .filter(Boolean);

    const handleMentionPress = (userId: string) => {
      if (userId === yourUserId) {
        navigation.navigate('Account');
      } else {
        navigation.navigate('ProfileComp', {userID: userId});
      }
    };

    // ✅ Custom render function để hỗ trợ mentions
    const renderTextWithMentionsWrapper = (text: string) => {
      return renderTextWithMentions(
        text,
        normalizedMentionData,
        handleMentionPress,
        {
          color: '#fff',
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
        },
        {
          color: '#4A90E2',
          fontWeight: '700',
        },
      );
    };

    const rawText = content?.text || '';

    // ✅ Hỗ trợ hiển thị nhiều caption nếu content.text được mã hoá bằng marker __MC__
    if (typeof rawText === 'string' && rawText.startsWith('__MC__')) {
      try {
        const json = rawText.slice('__MC__'.length);
        const parsed = JSON.parse(json);
        if (
          parsed &&
          parsed.type === 'multi' &&
          Array.isArray(parsed.items) &&
          parsed.items.length > 0
        ) {
          return (
            <>
              {parsed.items.map((item: any, index: number) => {
                const ix = Number(item?.x) || 10;
                const iy = Number(item?.y) || 20;
                const itext = String(item?.text || '');
                if (!itext) return null;
                return (
                  <DraggableCaption
                    key={`mc_${selectedItem?._id}_${index}`}
                    text={itext}
                    initialX={ix}
                    initialY={iy}
                    draggable={false}
                    renderText={renderTextWithMentionsWrapper}
                    style={{zIndex: 1000}}
                  />
                );
              })}
            </>
          );
        }
      } catch (e) {
        // Fallback bên dưới
      }
    }

    // Fallback: hiển thị như logic cũ (một caption duy nhất)
    const fullText = content?.text || '';
    const mentionsText =
      (tags || [])
        .map((tag: any) => {
          if (tag?.user && typeof tag.user === 'object') {
            return `@${tag.user.username || tag.user.handleName || ''}`.trim();
          }
          return `@${tag?.username || tag?.handleName || ''}`.trim();
        })
        .filter(Boolean)
        .join(' ') || '';
    const combinedText =
      fullText && mentionsText
        ? `${fullText} ${mentionsText}`
        : fullText || mentionsText;

    if (!combinedText) {
      return null;
    }

    return (
      <DraggableCaption
        text={combinedText}
        initialX={content?.x || 10}
        initialY={content?.y || 20}
        draggable={false}
        renderText={renderTextWithMentionsWrapper}
        style={{zIndex: 1000}}
      />
    );
  };

  // logic khi nhấn vàp textInput thì dứng story
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setIsPaused(true);
    });

    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setIsPaused(false);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  // ✅ Update like status from synced story data
  useEffect(() => {
    const liked = selectedItem?.likedByUsers?.includes(user?._id);
    setIsLiked(liked || false);
  }, [selectedItem?.likedByUsers, user?._id]);

  const onImageLoad = () => {
    setIsMediaLoading(false);
    startProgressAnimation();
  };

  useEffect(() => {
    if (!selectedItem) return;

    stopCurrentAnimation();
    setVideoDuration(null);
    setMusicDuration(null);
    setIsVideoLoaded(false);
    setIsMusicLoaded(false);
    setIsMediaLoading(true);

    // ✅ Reset progress bar based on current index and syncedStories length
    progressAnims.forEach((anim, i) => {
      if (i < currentIndex && i < syncedStories.length) {
        anim.setValue(1); // Completed stories
      } else {
        anim.setValue(0); // Current and future stories
      }
    });

    // ✅ Reset video ref để đảm bảo video mới được load
    if (videoRef.current) {
      videoRef.current.seek(0);
    }

    // ✅ Reset pause state when switching to a new story (for owner mode)
    if (isCurrentUserStory) {
      setIsPaused(false);
      setWasPausedByUser(false);
    }

    //  Nếu không có video/music, start luôn
    const hasVideo = !!selectedItem.uriVideo;
    const hasMusic = !!selectedItem.music?.link;

    if (!hasVideo && !hasMusic) {
      startProgressAnimation();
    }
  }, [currentIndex, syncedStories.length, isCurrentUserStory]);

  useEffect(() => {
    if (!isPaused) {
      startProgressAnimation();
    } else {
      stopCurrentAnimation();
    }
  }, [isPaused]);

  // ✅ Viewer-specific: Copy link functionality
  const handleCopyLink = () => {
    if (isCurrentUserStory) return; // Owner doesn't have copy link



    if (selectedItem?._id) {
      // Generate deeplink for the story - use universal link format
      const deeplink = `https://cirla.io.vn/story/${selectedItem._id}/${
        currentCreator?._id || ''
      }`;

      Clipboard.setString(deeplink);
    } else {
    
    }
  };

  // ✅ Viewer-specific: Reply functionality
  const handleOpenReply = () => {
    if (isCurrentUserStory) return; // Owner can't reply to their own story



    stopCurrentAnimation();
    setIsPaused(true); // Pause story when opening reply modal
    replyModalRef.current?.open(); // phải dùng ref để mở Modal
  };

  // ✅ Owner-specific: Modal handlers
  useEffect(() => {
    if (visible) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [visible]);

  // ✅ Owner-specific: Cleanup
  useEffect(() => {
    return () => {
      if (isCurrentUserStory) {
        isNavigatingRef.current = false;
      }
    };
  }, [isCurrentUserStory]);

  // ✅ Show loading skeleton if data is still loading, story is loading, or no story selected
  if (isDataLoading || !selectedItem || selectedItem.isLoading) {
    return <StoryLoadingSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.mediaWrapper}
        activeOpacity={1}
        onPress={handleTouch}>
        {/* Unified Header for both owner and viewer */}
        <Header
          onClose={() => navigation.goBack()}
          username={currentCreator?.username} // ✅ Hiển thị username thực sự
          handleName={currentCreator?.handleName} // ✅ Truyền handleName để xử lý logic
          profilePic={currentCreator?.profilePic}
          pause={isPaused}
          onTogglePause={togglePause}
          mute={isMuted}
          onToggleMute={toggleMute}
          createdAt={selectedItem?.createdAt}
          navigation={navigation}
          creatorId={currentCreator?._id}
          yourUserId={yourUserId}
          isOwner={isCurrentUserStory}
        />

        <ProgressBar
          progressAnims={progressAnims}
          storyCount={syncedStories.length}
        />

        {/* ✅ Thêm container tương tự như EditStory để đảm bảo vị trí caption chính xác */}
        <View style={styles.mediaTouchArea}>
          <MediaPlayer
            key={`${selectedItem?._id}-${currentIndex}`} // ✅ Force re-render khi chuyển story
            item={selectedItem}
            ref={videoRef}
            onLoad={d => {
              setVideoDuration(d.duration);
              setIsVideoLoaded(true);
            }}
            onEnd={goToNextStory}
            onMediaLayout={setMediaSize}
            onMusicLoad={seconds => {
              setMusicDuration(seconds);
              setIsMusicLoaded(true);
            }}
            onMusicEnd={goToNextStory}
            paused={isPaused}
            muted={isMuted}
            isMediaLoading={isMediaLoading}
            onImageLoad={onImageLoad}
            forceReset={true} // ✅ Force reset sound khi chuyển story
          />
          {renderCaption()}
        </View>
        {/* {renderTags()} */}
      </TouchableOpacity>

      {/* Conditional Footer based on ownership */}
      {isCurrentUserStory ? (
        <SeenStoryOwnerBottom
          onShowPeopleSeen={() => {
            setVisible(true);
            // ✅ Pause story khi mở modal People Seen
            if (!isPaused) {
              setIsPaused(true);
              setWasPausedByUser(true);
            }
          }}
          onShowMore={() => {
            setVisibleSeeMore(true);
            // ✅ Pause story khi mở modal SeeMore
            if (!isPaused) {
              setIsPaused(true);
              setWasPausedByUser(true);
            }
          }}
          visible={visible}
          users={(selectedItem?.viewedByUsers || []).filter(
            (viewer: any) => viewer._id !== currentCreator?._id
          )}
          onClose={() => setVisible(false)}
          onDelete={handleDeleteStory}
        />
      ) : (
        <Footer
          onLike={handleLike}
          isLiked={isLiked}
          scaleAnim={scaleAnim}
          onPressCopyLink={handleCopyLink}
          onPressReply={handleOpenReply}
          onShare={() => {
            // ✅ Toggle pause state khi share (pause/resume)
            setIsPaused(prev => !prev);
          }}
          storyId={selectedItem?._id}
          creatorId={currentCreator?._id || selectedItem?.ownerId}
          shareCount={selectedItem?.shareCount || 0}
          createdAt={selectedItem?.createdAt}
        />
      )}

      {/* Conditional Modals based on ownership */}
      {!isCurrentUserStory && (
        <ModalReplyStory
          ref={replyModalRef}
          storyData={{
            _id: selectedItem?._id,
            mediaUrl: selectedItem?.mediaUrl,
            type: selectedItem?.uriVideo ? 'video' : 'image',
          }}
          creatorId={currentCreator?._id}
          onOpen={() => {
            // Story is already paused in handleOpenReply
            stopCurrentAnimation(); // đảm bảo animation ngừng
          }}
          onClose={() => {
            // Chỉ resume story khi modal thực sự đóng hoàn toàn
            setIsPaused(false); // tiếp tục
            startProgressAnimation(); // gọi lại animation!
          }}
        />
      )}

      {/* Owner-specific modals */}
      {isCurrentUserStory && (
        <Portal>
          <ModelPeopleSeen
            visible={visible}
            onClose={() => {
              setVisible(false);
              // ✅ Resume story khi đóng modal People Seen (nếu không phải do user pause)
              if (wasPausedByUser && !isNavigatedAway) {
                setIsPaused(false);
                setWasPausedByUser(false);
              }
            }}
            users={(selectedItem?.viewedByUsers || []).filter(
              (viewer: any) => viewer._id !== currentCreator?._id
            )}
            likedByUsers={selectedItem?.likedByUsers || []}
            onUserPress={user => {
              setVisible(false);
              if (user._id === yourUserId) {
                navigation.navigate('Account');
              } else {
                navigation.navigate('ProfileComp', {userID: user._id});
              }
            }}
          />
          <ModalSeeMore
            visible={visibleSeeMore}
            onClose={() => {
              setVisibleSeeMore(false);
              // ✅ Resume story khi đóng modal SeeMore (nếu không phải do user pause)
              if (wasPausedByUser && !isNavigatedAway) {
                setIsPaused(false);
                setWasPausedByUser(false);
              }
            }}
            onDelete={handleDeleteStory}
          />
        </Portal>
      )}
    </SafeAreaView>
  );
};
