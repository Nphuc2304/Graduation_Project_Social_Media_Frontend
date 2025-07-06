import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import {useTheme} from '../../util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  PlusSquare,
  Menu,
  Grid,
  Lock,
  ChevronDown,
  Share2,
  Moon,
  Video,
  SquareUserRound,
} from 'lucide-react-native';
import {Styles} from '../../StyleSheet/Profile.Styles';
import {SwitchAccount} from '../../../components/SwitchAccount';
import {ViewMore} from '../../../components/ViewMore';
import ModalCreate from './components/ModalCreate';
import {PostsView, ReelsView, TagsView} from './components/PostView.component';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {
  fetchFollowers,
  fetchFollowing,
} from '../../../services/relationRedux/relationSlice';
import {getPostsAndReelsOfUser} from '../../../services/postUserRedux/postUserSlice';
import ACNavigateModal, {
  ACNavigateRef,
} from '../../../src/Screens/AccountCenter/components/ACNavigateModal';
import {fetchTaggedPosts} from '@services/taggedPostRedux/taggedPostSlice';
import {
  fetchHighlightStory,
  fetchStoryDetails,
} from '../../../services/StoryRedux/StorySlice';
import HighlightStories from './components/HighlightStories';
import HighlightStoriesSkeleton from './components/HiglightStoriesSkeleton';
import {useHighlightStoryDetails} from './hook/useHighlightStoryDetails';
import {useProfileData} from './hook/useProfileData';

const Profile = () => {
  const navigation: any = useNavigation();
  const {theme} = useTheme();
  const color = Colors[theme];
  const {styles} = Styles;
  const user = useSelector((state: RootState) => state.user.user);
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user?.user?._id);
  const {followers, following} = useSelector(
    (state: RootState) => state.relation,
  );
  const {refreshToken} = useSelector((state: RootState) => state.user);
  const {items: PostsItem}: any | null = useSelector(
    (state: RootState) => state.postUser.posts,
  );
  const {items: ReelsItem}: any | null = useSelector(
    (state: RootState) => state.postUser.reels,
  );
  const {isSuccess} = useSelector((state: RootState) => state.postUser);
  const {highlightStories} = useSelector((state: RootState) => state.stories);
  const [visibleModalCreate, setVisibleModalCreate] = useState(false);
  const [isSwitchAccountVisible, setSwitchAccountVisible] = useState(false);
  const handleUsernamePress = () => {
    setSwitchAccountVisible(true);
  };
  const acModalRef = useRef<ACNavigateRef>(null);

  const [isViewMoreVisible, setViewMoreVisible] = useState(false);

  // Hook để quản lý highlight story details
  const {
    storyGroups,
    loadingStates,
    fetchedHighlights,
    fetchStoryDetailsForHighlight,
    fetchMoreOnScroll,
  } = useHighlightStoryDetails({
    highlights: highlightStories,
    userId,
  });

  // Hook để quản lý dữ liệu Profile
  const {fetchProfileData} = useProfileData();

  // These two State Functionals below is for handle the length of bio
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [viewMoreBio, setViewMoreBio] = useState<Boolean>(false);
  const handleLengthBio = (bioText?: string) => {
    const MAX_LINES = 4;
    if (!bioText) {
      return <Text style={[styles.bioText, {color: color.text}]} />;
    }

    return (
      <View>
        <Text
          numberOfLines={viewMoreBio ? undefined : MAX_LINES}
          ellipsizeMode="tail"
          onTextLayout={({nativeEvent}) => {
            setNeedsTruncation(nativeEvent.lines.length > MAX_LINES);
          }}
          style={[styles.bioText, {color: color.text}]}>
          {bioText}
        </Text>

        {needsTruncation && (
          <TouchableOpacity onPress={() => setViewMoreBio(!viewMoreBio)}>
            <Text style={{color: color.blue}}>
              {viewMoreBio ? 'Thu gọn' : 'Xem thêm'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const [activeTab, setActiveTab] = useState('grid');

  const renderHeader = () => (
    <View style={{flex: 1}}>
      <View style={styles.header}>
        <View style={styles.usernameContainer}>
          <Lock size={20} color={color.text} />
          <TouchableOpacity onPress={handleUsernamePress}>
            <Text style={[styles.username, {color: color.text}]}>
              {user?.handleName}
            </Text>
          </TouchableOpacity>
          <ChevronDown size={16} color={color.text} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setVisibleModalCreate(true)}>
            <PlusSquare color={color.text} size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Setting')}>
            <Menu color={color.text} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{flex: 1}}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user?.profilePic
                  ? {uri: user.profilePic}
                  : {
                      uri: 'https://i.pinimg.com/736x/09/80/62/098062ede8791dc791c3110250d2a413.jpg',
                    }
              }
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.addStoryButton}
              onPress={() => {
                navigation.navigate('UpStory');
              }}>
              <Text style={styles.addStoryIcon}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, {color: color.text}]}>
                {isSuccess && (PostsItem?.length || ReelsItem?.length)
                  ? PostsItem?.length + ReelsItem?.length
                  : 0}
              </Text>
              <Text style={[styles.statLabel, {color: color.text}]}>
                bài viết
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('FollowersScreen')}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, {color: color.text}]}>
                  {followers?.length ? followers?.length : 0}
                </Text>
                <Text style={[styles.statLabel, {color: color.text}]}>
                  người theo dõi
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('FollowersScreen', {
                  screen: 'FollowingTab',
                })
              }>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, {color: color.text}]}>
                  {following?.length ? following?.length : 0}
                </Text>
                <Text style={[styles.statLabel, {color: color.text}]}>
                  đang theo dõi
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={[styles.displayName, {color: color.text}]}>
            {user?.username}
          </Text>
          <View style={styles.modeContainer}>
            <Moon size={14} color={color.textSecondary} />
            <Text style={[styles.modeText, {color: color.textSecondary}]}>
              Ở chế độ im lặng
            </Text>
          </View>
          {handleLengthBio(user?.bio)}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.headerButton, {backgroundColor: color.gray}]}
            onPress={() => navigation.navigate('EditProfile')}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.buttonText, {color: color.text}]}>
              Chỉnh sửa trang cá nhân
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, {backgroundColor: color.gray}]}
            onPress={() => navigation.navigate('QRCode')}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.buttonText, {color: color.text}]}>
              Chia sẻ trang cá nhân
            </Text>
          </TouchableOpacity>
        </View>

        {/* Highlight Stories Section */}
        {highlightStories && highlightStories.length > 0 ? (
          <HighlightStories
            highlights={highlightStories}
            loadingStates={loadingStates}
            onHighlightPress={async highlight => {
              try {
                // Kiểm tra xem highlight đã được fetch chưa
                if (!fetchedHighlights.has(highlight._id)) {
                  // Nếu chưa fetch, fetch ngay lập tức
                  await fetchStoryDetailsForHighlight(highlight);
                }

                // Tìm story group tương ứng
                const currentStoryGroup = storyGroups.find(
                  group => group.highlightId === highlight._id,
                );

                if (!currentStoryGroup) {
                  console.warn(
                    '⚠️ Story group not found for highlight:',
                    highlight._id,
                  );
                  return;
                }

                // Tìm index của highlight hiện tại
                const currentHighlightIndex = highlightStories.findIndex(
                  h => h._id === highlight._id,
                );

                // Story groups đã được sắp xếp theo thứ tự của highlights
                const orderedStoryGroups = storyGroups;

                if (orderedStoryGroups.length > 0) {
                  navigation.navigate('SeenStoryOwner', {
                    storyGroups: orderedStoryGroups,
                    storyGroupIndex:
                      currentHighlightIndex >= 0 ? currentHighlightIndex : 0,
                    creator: {
                      username: user?.handleName,
                      profilePic: user?.profilePic,
                      _id: user?._id,
                    },
                    stories: currentStoryGroup.stories,
                    timestamp: Date.now(),
                    isHighlightMode: true,
                  });
                } else {
                  console.warn('⚠️ No valid story groups found');
                }
              } catch (error) {
                console.error('❌ Error navigating to highlight:', error);
              }
            }}
            onAddHighlight={() => {
              navigation.navigate('Archive');
            }}
            onScroll={fetchMoreOnScroll}
          />
        ) : (
          <HighlightStoriesSkeleton />
        )}

        <ModalCreate
          visible={visibleModalCreate}
          onClose={() => setVisibleModalCreate(false)}
          onSelect={(id: string) => {
            switch (id) {
              case 'reels':
                navigation.navigate('AddPost', {type: 'video'});
                break;
              case 'post':
                navigation.navigate('AddPost');
                break;
              case 'story':
                navigation.navigate('UpStory');
                break;
              case 'highlight':
                navigation.navigate('Archive');
                break;
              default:
                break;
            }
          }}
        />
      </View>
    </View>
  );

  const renderTabBar = () => (
    <View style={[styles.tabBar, {backgroundColor: color.background}]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'grid' && styles.activeTab,
          {borderBottomColor: color.text},
        ]}
        onPress={() => setActiveTab('grid')}>
        <Grid
          color={activeTab === 'grid' ? color.text : color.textSecondary}
          size={24}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'reels' && styles.activeTab,
          {borderBottomColor: color.text},
        ]}
        onPress={() => setActiveTab('reels')}>
        <Video
          color={activeTab === 'reels' ? color.text : color.textSecondary}
          size={24}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'tags' && styles.activeTab,
          {borderBottomColor: color.text},
        ]}
        onPress={() => setActiveTab('tags')}>
        <SquareUserRound
          color={activeTab === 'tags' ? color.text : color.textSecondary}
          size={24}
        />
      </TouchableOpacity>
    </View>
  );

  const taggedPosts = useSelector((state: RootState) => state.taggedPosts.data);
  const renderContent = () => {
    switch (activeTab) {
      case 'grid':
        return isSuccess && PostsItem ? (
          <PostsView data={PostsItem} />
        ) : (
          <LoadingPlaceholder />
        );
      case 'reels':
        return isSuccess && ReelsItem ? (
          <ReelsView data={ReelsItem} />
        ) : (
          <LoadingPlaceholder />
        );
      case 'tags':
        return isSuccess && taggedPosts ? (
          <TagsView data={taggedPosts as any} />
        ) : (
          <LoadingPlaceholder />
        );
      default:
        return <LoadingPlaceholder />;
    }
  };

  const LoadingPlaceholder = () => (
    <View style={[styles.content, styles.centerItem, {height: 50}]}>
      <Text style={styles.textno}>Đang tải...</Text>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(getPostsAndReelsOfUser({refreshToken, userId: userId}));
      // Fetch highlight stories khi focus vào Profile
      if (userId) {
        dispatch(fetchHighlightStory({userId}));
      }
    }, [dispatch, refreshToken, userId]),
  );

  // Lắng nghe navigation params để refresh highlight stories
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = navigation
        .getState()
        .routes.find((route: any) => route.name === 'Account')?.params;

      if (params?.shouldRefreshHighlights && userId) {
        dispatch(fetchHighlightStory({userId}));
        // Clear the parameter to prevent infinite refresh
        navigation.setParams({shouldRefreshHighlights: false});
      }
    });

    return unsubscribe;
  }, [navigation, dispatch, userId]);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: color.background}}>
      <ScrollView>
        {renderHeader()}
        {renderTabBar()}
        {renderContent()}
      </ScrollView>
      <SwitchAccount
        visible={isSwitchAccountVisible}
        onClose={() => setSwitchAccountVisible(false)}
        navigation={navigation}
        onAddAccountPress={() => {
          setSwitchAccountVisible(false);
          setTimeout(() => acModalRef.current?.open(), 200);
        }}
      />
      <ViewMore
        visible={isViewMoreVisible}
        onClose={() => setViewMoreVisible(false)}
        postId="123456"
      />
      <ACNavigateModal ref={acModalRef} />
    </SafeAreaView>
  );
};

export default Profile;
