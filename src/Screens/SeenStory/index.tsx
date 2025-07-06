import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Animated,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {
  fetchFollowingStories,
  toggleLikeStory,
} from '../../../services/StoryRedux/StorySlice';
import {styles} from './components/styles';
import {Header} from './components/Header';
import {ProgressBar} from './components/ProgressBar';
import {MediaPlayer} from './components/MediaPlayer';
import {Footer} from './components/Footer';

import {Keyboard} from 'react-native';
import ModalShareStory, {ModalShareHandle} from './components/modalShare';
import StoryLoadingSkeleton from '../../(tabs)/Home/components/StoryLoadingSkeleton';
import {debugStoryGroups} from '../../(tabs)/Home/util';
import {renderTextWithMentions} from '../../util/storyTextRenderer';
import {
  fetchStoryDetails,
  seenStory,
} from '../../../services/StoryRedux/StorySlice';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {
  checkStorySeenInStorage,
  markStoryAsSeen,
} from '../../../services/storage/storage';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// ✅ Simple Loading Component as fallback
const SimpleLoading = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
    <ActivityIndicator size="large" color="#fff" />
    <Text
      style={{
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
      }}>
      Đang tải story...
    </Text>
  </View>
);

export const SeenStory = ({route, navigation}: any) => {
  const {
    creator,
    stories: routeStories = [],
    storyGroups = [],
    storyGroupIndex = 0,
    isLoading = false,
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
  const shareModalRef = useRef<ModalShareHandle>(null);

  // Hàm fetch stories cho highlight
  const fetchStoriesForHighlight = async (
    highlightId: string,
    groupIndex: number,
  ) => {
    try {
      // Tìm highlight trong allHighlights
      const allHighlights = route.params?.allHighlights;
      const highlight = allHighlights?.find((h: any) => h._id === highlightId);

      if (!highlight || !highlight.storyId) {
        console.error('❌ Highlight not found or no storyId');
        return;
      }

      // Fetch story details
      const detailRes = await dispatch(
        fetchStoryDetails({storyIds: highlight.storyId}),
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
                item.mediaUrl?.endsWith('.jpg') ||
                item.mediaUrl?.endsWith('.png')
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

      if (validStories.length > 0) {
        // Cập nhật storyGroups với stories mới
        const updatedStoryGroups = [...currentStoryGroups];
        updatedStoryGroups[groupIndex] = {
          ...updatedStoryGroups[groupIndex],
          stories: validStories,
        };

        // Navigate đến highlight mới
        const isOwner =
          updatedStoryGroups[groupIndex].creator?.username ===
            user?.handleName ||
          updatedStoryGroups[groupIndex].creator?._id === user?._id;
        const routeName = isOwner ? 'SeenStoryOwner' : 'SeenStory';

        navigation.replace(routeName, {
          storyGroups: updatedStoryGroups,
          storyGroupIndex: groupIndex,
          creator: updatedStoryGroups[groupIndex].creator,
          stories: validStories,
          initialIndex: 0,
          timestamp: Date.now(),
          isHighlightMode: route.params?.isHighlightMode,
          allHighlights: route.params?.allHighlights,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stories for highlight:', error);
      GlobalAlertManager.show('Lỗi', 'Không thể tải highlight tiếp theo');
    }
  };

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

      // ✅ Resume story khi quay lại từ profile
      if (isPaused) {
        setIsPaused(false);
      }
    });

    // ✅ Listen for blur event (khi navigate away)
    const blurUnsubscribe = navigation.addListener('blur', () => {
      // Pause story khi navigate away
      if (!isPaused) {
        setIsPaused(true);
      }
    });

    return () => {
      unsubscribe();
      blurUnsubscribe();
    };
  }, [navigation, route.params, isPaused]);

  // ✅ Update progress anims when stories change
  useEffect(() => {
    if (stories.length !== progressAnims.length) {
      progressAnims.splice(0, progressAnims.length);
      progressAnims.push(...stories.map(() => new Animated.Value(0)));
    }
  }, [stories.length]);

  const selectedItem = useMemo(
    () => stories[currentIndex] || {},
    [stories, currentIndex],
  );

  // ✅ Show loading skeleton if data is still loading or story is loading
  if (isDataLoading || selectedItem.isLoading) {
    return <StoryLoadingSkeleton />;
  }

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
  const videoRef = useRef<any>(null);

  // hàm next story
  const goToNextStory = () => {
    stopCurrentAnimation();

    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
          nextGroup.creator?.username === user?.handleName ||
          nextGroup.creator?._id === user?._id;
        const routeName = isOwner ? 'SeenStoryOwner' : 'SeenStory';

        // Nếu đang ở highlight mode và next group chưa có stories, fetch stories
        if (
          route.params?.isHighlightMode &&
          nextGroup.highlightId &&
          (!nextGroup.stories || nextGroup.stories.length === 0)
        ) {
          // Fetch stories cho highlight tiếp theo
          fetchStoriesForHighlight(nextGroup.highlightId, nextGroupIndex);
        } else {
          navigation.replace(routeName, {
            storyGroups: currentStoryGroups,
            storyGroupIndex: nextGroupIndex,
            creator: nextGroup.creator,
            stories: nextGroup.stories,
            initialIndex: 0,
            timestamp: Date.now(),
            isHighlightMode: route.params?.isHighlightMode,
            allHighlights: route.params?.allHighlights,
          });
        }
      } else {
        navigation.goBack();
      }
    }
  };

  // hàm thanh ProgressBar hoạt dộng
  const startProgressAnimation = () => {
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
  };

  const stopCurrentAnimation = () => {
    animationRef.current?.stop();
    animationRef.current = null;
  };

  // hàm lùi story
  const goToPreviousStory = () => {
    stopCurrentAnimation();

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
            prevGroup.creator?.username === user?.handleName ||
            prevGroup.creator?._id === user?._id;
          const routeName = isOwner ? 'SeenStoryOwner' : 'SeenStory';

          navigation.replace(routeName, {
            storyGroups: currentStoryGroups,
            storyGroupIndex: prevGroupIndex,
            creator: prevGroup.creator,
            stories: prevGroup.stories,
            initialIndex: (prevGroup.stories.length || 1) - 1,
            timestamp: Date.now(),
          });

          return;
        }

        prevGroupIndex--;
      }

      navigation.goBack();
    }
  };

  // pause
  const togglePause = () => setIsPaused(prev => !prev);
  // mute
  const toggleMute = () => setIsMuted(prev => !prev);

  const handleTouch = (event: any) => {
    const {locationX} = event.nativeEvent;
    if (locationX < screenWidth / 3) goToPreviousStory();
    else if (locationX > (screenWidth * 2) / 3) goToNextStory();
  };

  const handleLike = async () => {
    try {
      await dispatch(toggleLikeStory({storyId: selectedItem._id})).unwrap();

      dispatch(fetchFollowingStories({page: 1}));

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
      console.error('Error liking story:', err);
    }
  };

  const getCaptionPosition = (xPercent: number, yPercent: number) => {
    const width = mediaSize.width || screenWidth;
    const height = mediaSize.height || screenHeight;
    return {
      left: (xPercent / 100) * width,
      top: (yPercent / 100) * height,
    };
  };

  const renderCaption = () => {
    const content = selectedItem?.content;
    const tags = selectedItem?.tags;

    const fullText = content?.text || '';

    const validTags =
      tags?.filter((tag: any) => tag.user && tag.handleName) || [];

    const mentionsText =
      validTags.map((tag: any) => `@${tag.handleName}`).join(' ') || '';
    const combinedText =
      fullText && mentionsText
        ? `${fullText} ${mentionsText}`
        : fullText || mentionsText;

    if (!combinedText) {
      console.log('❌ [SeenStory] No combined text to display');
      return null;
    }

    const {x = 50, y = 50} = content || {};
    const left = (x / 100) * (mediaSize.width || screenWidth);
    const top = (y / 100) * (mediaSize.height || screenHeight);

    // Tạo mention data để có thể click từ valid tags only (adapt to backend structure)
    const mentionData = validTags.map((tag: any) => ({
      handleName: tag.handleName,
      _id: tag.user, // user field is the ID string
    }));

    const handleMentionPress = (userId: string) => {
      // ✅ Story sẽ tự động pause thông qua blur listener
      navigation.navigate('ProfileComp', {userID: userId});
    };

    return (
      <TouchableOpacity
        style={{
          position: 'absolute',
          left,
          top,
        }}
        activeOpacity={1}>
        {renderTextWithMentions(
          combinedText,
          mentionData,
          handleMentionPress,
          {
            color: '#fff',
            fontSize: 18,
            fontWeight: '600',
          },
          {
            color: '#4A90E2',
            fontWeight: '700',
          },
        )}
      </TouchableOpacity>
    );
  };

  const renderTags = () => {
    const tags = selectedItem?.tags || [];

    return tags.map((tagData: any, index: number) => {
      const {user: userId, position, handleName, username} = tagData;

      if (!userId || !position || !handleName) {
        console.log('❌ [SeenStory] Missing required tag data:', {
          userId,
          position,
          handleName,
        });
        return null;
      }

      const {x, y} = position;

      // ✅ Use data directly from tag object (backend puts user info at tag level)
      const finalUserData = {
        _id: userId, // user field is the ID
        handleName: handleName,
        username: username,
      };

      const tagPosition = getCaptionPosition(x * 100, y * 100);

      const handleTagPress = () => {
        if (finalUserData._id) {
          navigation.navigate('ProfileComp', {
            userID: finalUserData._id,
          });
        } else {
          console.log('❌ [SeenStory] No userID found');
        }
      };

      return (
        <TouchableOpacity
          key={index}
          onPress={handleTagPress}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            left: tagPosition.left,
            top: tagPosition.top,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 15,
            zIndex: 999,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}>
          <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
            @{finalUserData.handleName}
          </Text>
        </TouchableOpacity>
      );
    });
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

  useEffect(() => {
    const liked = selectedItem?.likedByUsers?.includes(user?._id);
    setIsLiked(liked || false);
  }, [selectedItem, user?._id]);

  useEffect(() => {
    if (!selectedItem) return;

    stopCurrentAnimation();
    setVideoDuration(null);
    setMusicDuration(null);
    setIsVideoLoaded(false);
    setIsMusicLoaded(false);
    progressAnims.forEach((anim, i) => {
      if (i < currentIndex) anim.setValue(1);
      else anim.setValue(0);
    });

    // Chỉ set loading = true khi có video hoặc nhạc
    const hasVideo = !!selectedItem.uriVideo;
    const hasMusic = !!selectedItem.music?.link;

    if (hasVideo || hasMusic) {
      setIsMediaLoading(true);
    } else {
      // Nếu chỉ có ảnh, không cần loading
      setIsMediaLoading(false);
      startProgressAnimation();
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!isPaused) {
      startProgressAnimation();
    } else {
      stopCurrentAnimation();
    }
  }, [isPaused]);

  const handleOpenShare = () => {
    stopCurrentAnimation();
    shareModalRef.current?.open(); // phải dùng ref để mở Modal
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.mediaWrapper}
        activeOpacity={1}
        onPress={handleTouch}>
        <Header
          onClose={() => navigation.goBack()}
          username={currentCreator?.username}
          profilePic={currentCreator?.profilePic}
          pause={isPaused}
          onTogglePause={togglePause}
          mute={isMuted}
          onToggleMute={toggleMute}
          createdAt={selectedItem?.createdAt}
        />
        <ProgressBar
          progressAnims={progressAnims}
          storyCount={stories.length}
        />
        <MediaPlayer
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
        />
        {renderCaption()}
        {/* {renderTags()} */}
      </TouchableOpacity>
      <Footer
        onLike={handleLike}
        isLiked={isLiked}
        scaleAnim={scaleAnim}
        onPressSend={handleOpenShare}
      />
      <ModalShareStory
        ref={shareModalRef}
        onOpen={() => {
          setIsPaused(true); // dừng story
          stopCurrentAnimation(); // đảm bảo animation ngừng
        }}
        onClose={() => {
          setIsPaused(false); // tiếp tục
          startProgressAnimation(); // gọi lại animation!
        }}
      />
    </SafeAreaView>
  );
};
