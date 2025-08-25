import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {SafeAreaView, ScrollView, View} from 'react-native';
import {useTheme} from '../../util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import {RouteProp, useIsFocused, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {AppDispatch} from '../../../services/store';
import {fetchPostsWithMedia} from '../../../services/postRedux/postSlice';
import {fetchFollowingStories} from '../../../services/StoryRedux/StorySlice';
import {forceRefreshStories} from '../../../services/StoryRedux/StoryReducer';
import Header from '../../../components/Header';
import ItemHome from './components/ItemHome';
import BottomSheetComment, {
  BottomSheetCommentRef,
} from './components/CommentSection';
import {handleUserPress} from './util';
import {
  checkStorySeenInStorage,
  clearExpiredSeenStories,
} from '../../../services/storage/storage';
import {ModalLoading} from './components/loading';
import {useStoryPrefetch} from './hook/useStoryPrefetch';
import {getNotification} from '@services/notificationRedux/notificationSlice';
import {fetchMyRooms} from '@services/roomRedux/roomSlice';
import StoryListHeader from './components/headerContainer';
import messaging from '@react-native-firebase/messaging';
import {fetchEditUser} from '@services/userRedux/userSlice';
import LoadingModal from '../../../components/Global/LoadingModal';
import {selectHomeData} from './selectors/homeSelectors';
import {HomeSkeleton} from '../../../components/SkeletonGrid';

const HEADER_HEIGHT = 100;
const AnimatedFlatList = Animated.createAnimatedComponent(Animated.FlatList);

type HomeStackParamList = {
  Home: {
    shouldRefresh?: boolean;
    timestamp?: number;
  };
};

type HomeProps = {
  route?: RouteProp<HomeStackParamList, 'Home'>;
};

export const Home = forwardRef(({route}: HomeProps, ref) => {
  const navigation = useNavigation<any>();
  const {theme} = useTheme();
  const color = Colors[theme];
  const isFocused = useIsFocused();
  const dispatch = useDispatch<AppDispatch>();
  const {
    posts,
    loading,
    page,
    hasNextPage,
    storyDetails,
    followingUsers,
    myStories,
    user,
    lastRefresh,
  } = useSelector(selectHomeData);
  const sheetRef = useRef<BottomSheetCommentRef>(null);
  const [currentVisible, setCurrentVisible] = useState<string | null>(null);
  const selectedPostRef = useRef<{postId: string; receiverId: string}>({
    postId: '',
    receiverId: '',
  });
  const [seenMap, setSeenMap] = useState<Record<string, boolean>>({});

  // Add loading state for pagination
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasCalledLoadMore, setHasCalledLoadMore] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  // // ✅ Add lazy loading state for stories
  const [visibleStoryCount, setVisibleStoryCount] = useState(5);
  const STORIES_LOAD_BATCH = 5; // Load 5 stories at a time
  const [isLoadingMoreStories, setIsLoadingMoreStories] = useState(false);

  // // ✅ Use prefetch hook
  const {prefetchStoryData, getCachedStoryData, clearExpiredCache, clearAllCache} =
    useStoryPrefetch();

  const reloadAllData = useCallback(() => {
    
    dispatch(fetchPostsWithMedia({page: 1}));
    dispatch(fetchFollowingStories({page: 1}));
    dispatch(forceRefreshStories()); // Force re-render
    clearExpiredSeenStories();
    clearAllCache(); // Clear all cache to ensure fresh data
    setHasCalledLoadMore(false);
    setVisibleStoryCount(5);
  }, [dispatch, clearAllCache]);

  // // ✅ Immediate refresh when myStories changes (story created/deleted)
  useEffect(() => {
    if (myStories.length > 0) {
      dispatch(forceRefreshStories()); // Force component re-render
      dispatch(fetchFollowingStories({page: 1})); // Fetch fresh data
      clearAllCache(); // Clear all cache to ensure fresh data
    }
  }, [myStories.length, dispatch, clearAllCache]);

  // // ✅ Listen for navigation params to trigger immediate refresh
  useEffect(() => {
    if (route?.params?.shouldRefresh || route?.params?.timestamp) {
      dispatch(forceRefreshStories());
      dispatch(fetchFollowingStories({page: 1}));
      clearAllCache(); // Clear all cache to ensure fresh data

      // Clear the params to prevent infinite refresh
      if (navigation.setParams) {
        navigation.setParams({shouldRefresh: false, timestamp: undefined});
      }
    }
  }, [
    route?.params?.shouldRefresh,
    route?.params?.timestamp,
    dispatch,
    navigation,
    clearAllCache,
  ]);

  // // ✅ Force refresh stories when user comes back to Home after creating/deleting story
  useEffect(() => {
    if (isFocused) {
      // Reduced delay for faster refresh
      const timeoutId = setTimeout(() => {
        dispatch(fetchFollowingStories({page: 1}));
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isFocused, dispatch]);

  // // ✅ Force refresh stories when lastRefresh timestamp changes (manual refresh or story updates)
  useEffect(() => {
    if (lastRefresh > 0) {
      // Clear cache and refresh stories when manual refresh is triggered
      clearAllCache(); // Clear all cache to ensure fresh data
      // Reset visible story count to ensure all stories are shown
      setVisibleStoryCount(5);
    }
  }, [lastRefresh, clearAllCache]);

  useImperativeHandle(ref, () => ({
    reload: reloadAllData,
  }));

  useEffect(() => {
    dispatch(fetchPostsWithMedia({page: 1}));
    dispatch(fetchFollowingStories({page: 1}));
    clearExpiredSeenStories();
    clearAllCache && clearAllCache(); // Clear all cache to ensure fresh data
    setHasCalledLoadMore(false);
    setVisibleStoryCount(5);
  }, [dispatch, clearAllCache]);

  // // ✅ Process and sort stories data with 24-hour filtering
  const processedStories = React.useMemo(() => {
    const filterValidStories = (users: any[]) => {
      return users
        .map(user => {
          // Filter stories to only include those within 24 hours
          const validStories =
            user.stories?.filter((storyId: string) => {
              const story = storyDetails.find(s => s._id === storyId);
              if (!story || !story.createdAt) return false;
              return true; // Allow all stories regardless of age
            }) || [];

          return {
            ...user,
            stories: validStories,
          };
        })
        .filter(user => {
          // Keep current user even if no stories, filter others only if they have valid stories
          const isCurrentUser =
            user._id === user?._id || user.handleName === user?.handleName;
          return isCurrentUser || user.stories?.length > 0;
        });
    };

    const currentUserStories = filterValidStories(
      followingUsers.filter(
        item => item._id === user?._id || item.handleName === user?.handleName,
      ),
    );

    const otherUsersStories = filterValidStories(
      followingUsers.filter(
        item => item._id !== user?._id && item.handleName !== user?.handleName,
      ),
    ).sort(
      (a, b) =>
        (b.stories?.length > 0 ? 1 : 0) - (a.stories?.length > 0 ? 1 : 0),
    );

    return [...currentUserStories, ...otherUsersStories];
  }, [followingUsers, user?._id, user?.handleName, storyDetails]);

  // // ✅ Get visible stories based on current count
  const visibleStories = React.useMemo(() => {
    return processedStories.slice(0, visibleStoryCount);
  }, [processedStories, visibleStoryCount]);

  // Handler for loading more stories when scrolling
  const handleStoryScroll = useCallback(
    (event: any) => {
      const {contentOffset} = event.nativeEvent;
      const currentIndex = Math.floor(contentOffset.x / 70); // Assuming each story item is ~70px wide

      // Load more when user reaches 3rd item from the end of visible stories
      const triggerPoint = Math.max(0, visibleStoryCount - 3);

      if (
        currentIndex >= triggerPoint &&
        visibleStoryCount < processedStories.length &&
        !isLoadingMoreStories
      ) {
        setIsLoadingMoreStories(true);

        const newCount = Math.min(
          visibleStoryCount + STORIES_LOAD_BATCH,
          processedStories.length,
        );
        setTimeout(() => {
          setVisibleStoryCount(newCount);
          setIsLoadingMoreStories(false);
        }, 300);
      }
    },
    [visibleStoryCount, processedStories.length, isLoadingMoreStories],
  );

  // // ✅ Prefetch stories when visible stories change
  const prefetchStoriesForVisibleUsers = useCallback(async () => {
    const usersToPreload = visibleStories.filter(u => u.stories?.length > 0);

    //   // Prefetch for visible users
    const priorityUsers = usersToPreload.slice(
      0,
      Math.min(5, usersToPreload.length),
    );

    for (const user of priorityUsers) {
      if (user.stories?.length > 0) {
        try {
          await prefetchStoryData(user._id, user.stories);
        } catch (error) {
          console.warn(error);
        }
      }
    }
  }, [visibleStories, prefetchStoryData]);

  // // ✅ Run prefetch when visible stories change
  useEffect(() => {
    if (visibleStories.length > 0 && storyDetails.length > 0) {
      setTimeout(prefetchStoriesForVisibleUsers, 500);
    }
  }, [
    visibleStories.length,
    storyDetails.length,
    prefetchStoriesForVisibleUsers,
  ]);

  // // ✅ Reset visible story count when followingUsers data changes significantly
  useEffect(() => {
    if (followingUsers.length > 0) {
      const currentProcessedLength = processedStories.length;
      if (visibleStoryCount > currentProcessedLength) {
        setVisibleStoryCount(Math.min(5, currentProcessedLength));
      }
    }
  }, [followingUsers.length, processedStories.length, visibleStoryCount]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage || hasCalledLoadMore) {
      return;
    }

    setIsLoadingMore(true);
    setHasCalledLoadMore(true);

    try {
      await dispatch(fetchPostsWithMedia({page: page + 1})).unwrap();
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
      setTimeout(() => setHasCalledLoadMore(false), 1000);
    }
  }, [dispatch, isLoadingMore, hasNextPage, page, hasCalledLoadMore]);

  useEffect(() => {
    dispatch(getNotification({page: 1}));
    dispatch(fetchMyRooms());
  }, [dispatch]);

  useEffect(() => {
    const removeFcmtoken = async () => {
      try {
        await messaging().deleteToken();
        dispatch(fetchEditUser({fcmToken: ''}));
      } catch (error) {
        console.warn('Lỗi khi xóa FcmToken: ', error);
      }
    };

    if (user && user.wantNotified === false) {
      removeFcmtoken();
    }
  }, [user?.wantNotified]);

  const prefetchNextPage = useCallback(() => {
    if (!isLoadingMore && hasNextPage && !hasCalledLoadMore) {
      loadMore();
    }
  }, [loadMore, isLoadingMore, hasNextPage, hasCalledLoadMore]);

  // // ✅ Force refresh stories when user comes back to Home after viewing stories
  useEffect(() => {
    if (isFocused) {
      const timeoutId = setTimeout(() => {
        dispatch(fetchFollowingStories({page: 1}));
        clearAllCache(); // Clear all cache to ensure fresh data
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [isFocused, dispatch, clearAllCache]);

  // // ✅ Force refresh seenMap when storyDetails change (when stories are marked as seen)
  useEffect(() => {
    const syncSeenStories = async () => {
      const map: Record<string, boolean> = {};
      for (const user of followingUsers) {
        for (const storyId of user.stories) {
          const story = storyDetails.find(s => s._id === storyId);
          const createdAt = story?.createdAt;
          if (!createdAt) continue;
          const seen = await checkStorySeenInStorage(storyId, createdAt);
          map[storyId] = seen;
        }
      }
      setSeenMap(map);
    };

    if (followingUsers.length && storyDetails.length) {
      syncSeenStories();
    }
  }, [followingUsers, storyDetails]);

  const onViewRef = useRef(({viewableItems}: {viewableItems: any[]}) => {
    const id = viewableItems[0]?.item?._id;
    if (id && id !== currentVisible) {
      setCurrentVisible(id);
    }

    if (viewableItems.length > 0 && posts.length > 0) {
      const currentIndex = posts.findIndex(post => post._id === id);
      const triggerPoint = Math.floor(posts.length * 0.7);

      if (currentIndex >= triggerPoint) {
        prefetchNextPage();
      }
    }
  }).current;

  const prevScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const scrolledUpDistance = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      const currentY = event.contentOffset.y;
      const delta = currentY - prevScrollY.value;

      if (currentY <= 0) {
        headerTranslateY.value = withTiming(0, {duration: 200});
        scrolledUpDistance.value = 0;
      } else if (delta > 0) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT, {duration: 200});
        scrolledUpDistance.value = 0;
      } else {
        scrolledUpDistance.value = Math.min(
          scrolledUpDistance.value - delta,
          1000,
        );
        if (scrolledUpDistance.value >= 20) {
          headerTranslateY.value = withTiming(0, {duration: 200});
        }
      }

      prevScrollY.value = currentY;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{translateY: headerTranslateY.value}],
  }));

  const renderItem = useCallback(
    ({item}: {item: any}) => {
      return (
        <ItemHome
          {...item}
          currentVisible={item._id === currentVisible}
          isFocused={isFocused}
          sheetRef={sheetRef}
          SelectedPostRef={selectedPostRef}
        />
      );
    },
    [currentVisible, isFocused],
  );

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View
        style={{
          paddingVertical: 20,
          alignItems: 'center',
          backgroundColor: color.background,
        }}>
        <LoadingModal />
      </View>
    );
  }, [isLoadingMore, color]);

  const handleStoryPress = useCallback(
    (item: any) => {
      const hasStory = item.stories?.length > 0;
      if (hasStory) {
        handleUserPress(
          item,
          dispatch,
          navigation,
          storyDetails,
          user,
          followingUsers,
          setIsStoryLoading,
          getCachedStoryData,
        );
      } else {
        const isCurrentUser =
          item._id === user?._id || item.handleName === user?.handleName;

        if (isCurrentUser) {
          navigation.navigate('UpStory');
        } else {
          navigation.navigate('ProfileComp', {
            userID: item._id,
            handlename: item.handleName,
          });
        }
      }
    },
    [
      dispatch,
      navigation,
      storyDetails,
      user,
      followingUsers,
      setIsStoryLoading,
      getCachedStoryData,
    ],
  );

  const storyListHeader = useMemo(
    () => (
      <View style={{height: 160, flex: 0}}>
        <StoryListHeader
          visibleStories={visibleStories}
          processedStories={processedStories}
          visibleStoryCount={visibleStoryCount}
          isLoadingMoreStories={isLoadingMoreStories}
          color={color}
          user={user}
          storyDetails={storyDetails}
          seenMap={seenMap}
          onStoryPress={handleStoryPress}
          onStoryScroll={handleStoryScroll}
        />
      </View>
    ),
    [
      visibleStories,
      processedStories,
      visibleStoryCount,
      isLoadingMoreStories,
      color,
      user,
      storyDetails,
      seenMap,
      handleStoryPress,
      handleStoryScroll,
    ],
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: color.background}}>
        {/* keep your animated header in place */}
        <Animated.View
          style={[
            {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10},
            animatedHeaderStyle,
          ]}>
          <Header
            icon={require('../../../assets/icon/logo_row.png')}
            iconQR={true}
            iconNotify={true}
            iconMessage={true}           
            navigation={navigation}
          />
        </Animated.View>

        {/* scrollable skeleton content below header */}
        <ScrollView
          contentContainerStyle={{
            paddingTop: HEADER_HEIGHT - 35,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}>
          <HomeSkeleton postCount={5} storyCount={8} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: color.background}}>
      <Animated.View
        style={[
          {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10},
          animatedHeaderStyle,
        ]}>
        <Header
          icon={require('../../../assets/icon/logo_row.png')}
          iconQR={true}
          iconNotify={true}
          iconMessage={true}               
          navigation={navigation}
        />
      </Animated.View>
      <AnimatedFlatList
        data={posts}
        keyExtractor={(item, index) => item._id + index}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={2}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        onViewableItemsChanged={onViewRef}
        viewabilityConfig={{itemVisiblePercentThreshold: 80}}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={storyListHeader}
      />
      <BottomSheetComment ref={sheetRef} selectedPostRef={selectedPostRef} />
      <ModalLoading visible={isStoryLoading} />
    </SafeAreaView>
  );
});

export default Home;
