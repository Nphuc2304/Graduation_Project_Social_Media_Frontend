import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Lock,
  Ellipsis,
  Grid,
  UserSquare2,
  Video,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import StoryComponent from './components/story.component';
import ActionButtons from './components/actionButton.component';
import UserInfo from './components/userInfo.component';
import {Modalize} from 'react-native-modalize';
import {Portal} from 'react-native-portalize';
import OptionModal from './components/optionModal';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {
  fetchFollowers,
  fetchFollowing,
  relationAction,
} from '../../../services/relationRedux/relationSlice';
import {getPublicProfile} from '../../../services/userRedux/userSlice';
import {clearPublicProfile} from '../../../services/userRedux/userReducer';
import {createRoom} from '../../../services/roomRedux/roomSlice';
import {
  PostsView,
  ReelsView,
} from '../../(tabs)/Profile/components/PostView.component';
import {getPostsAndReelsOfUser} from '../../../services/postUserRedux/postUserSlice';
import {clearPostsAndReels} from '../../../services/postUserRedux/postUserReducer';

import {
  fetchHighlightStory,
  fetchStoryDetails,
} from '../../../services/StoryRedux/StorySlice';
import HighlightStories from '../../(tabs)/Profile/components/HighlightStories';
import {handleHighlightPress} from '../../(tabs)/Home/util';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {fetchTaggedPosts} from '@services/taggedPostRedux/taggedPostSlice';

const ProfileComp = ({route}: any) => {
  const navigation: any = useNavigation();
  const {theme} = useTheme();
  const styles = createStyles(theme);
  const userID: string = route.params?.userID;
  const modalOptionRef = useRef<Modalize>(null);
  const myUserId = useSelector((state: RootState) => state.user.user?._id);
  const user = useSelector((state: RootState) => state.user.user);

  const [isInitializing, setIsInitializing] = useState(true);

  const prevUserRef = useRef<string | null>(null);

  const navigateToUserFollow = (initialTab: string = 'UserFollowersTab') => {
    navigation.navigate('UserFollowScreen', {
      screen: initialTab,
      userID: userID,
      profileName: publicProfile?.username,
    });
  };

  const handleMessagePress = async () => {
    try {
      const res = await dispatch(
        createRoom({
          name: '',
          user_ids: [userID],
          type: 'waiting',
        }),
      ).unwrap();

      const {room} = res;

      const otherUsers = room.user_ids.filter(user => user._id !== myUserId);
      const img1 = otherUsers[0]?.profilePic;
      const img2 = myUserId
        ? room.user_ids.find(user => user._id === myUserId)?.profilePic
        : undefined;

      navigation.navigate('MessageScreen', {
        room: room._id,
        img1,
        img2,
      });
    } catch (error) {
      console.log('Tạo room thất bại:', error);
    }
  };

  const openOptionModal = () => {
    modalOptionRef.current?.open();
  };

  const closeOptionModal = () => {
    modalOptionRef.current?.close();
  };

  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlock, setIsBlock] = useState(false);
  const toggleFollow = useCallback(async () => {
    setLocalFollowersCount(prev => prev + (isFollowing ? -1 : 1));
    setIsFollowing(!isFollowing);
    GlobalAlertManager.show(
      'Thông báo',
      isFollowing
        ? 'Bạn đã bỏ theo dõi người dùng này.'
        : 'Bạn đã theo dõi người dùng này.',
    );
    const actionType = isFollowing ? 'unfollow' : 'follow';
    try {
      await dispatch(
        relationAction({
          targetId: userID,
          action: actionType,
          senderId: user?._id,
          handleName: user?.handleName,
        }),
      ).unwrap();
    } catch (error) {
      GlobalAlertManager.show('Thất bại', 'Vui lòng thử lại sau.');
      setIsFollowing(isFollowing);
    }
  }, [isFollowing]);

  const toggleUnblock = useCallback(async () => {
    setIsBlock(false);
    setIsFollowing(isFollowing);
    GlobalAlertManager.show('Thông báo', 'Bạn đã bỏ chặn người dùng này.');
    try {
      await dispatch(
        relationAction({
          targetId: userID,
          action: 'unblock',
        }),
      ).unwrap();
    } catch (error) {
      GlobalAlertManager.show('Thất bại', 'Vui lòng thử lại sau.');
      setIsBlock(true);
    }
  }, []);

  const dispatch = useDispatch<AppDispatch>();

  const [localFollowersCount, setLocalFollowersCount] = useState(0);
  const [localFollowingCount, setLocalFollowingCount] = useState(0);

  const {
    publicProfile,
    isLoadingPublicProfile,
    isErrorPublicProfile,
    errorMessagePublicProfile,
  } = useSelector((state: RootState) => state.user);

  const {items: PostsItem}: any | null = useSelector(
    (state: RootState) => state.postUser.posts,
  );
  const {items: ReelsItem}: any | null = useSelector(
    (state: RootState) => state.postUser.reels,
  );

  const {isSuccess} = useSelector((state: RootState) => state.postUser);
  const {refreshToken} = useSelector((state: RootState) => state.user);

  const {highlightStories} = useSelector((state: RootState) => state.stories);

  const profileTaggedPosts = useSelector(
    (state: RootState) => state.taggedPosts.data,
  );

  const initializeProfile = useCallback(async () => {
    if (!userID) {
      return;
    }

    setIsInitializing(true);

    try {
      // Clear old data if different user
      if (prevUserRef.current && prevUserRef.current !== userID) {
        dispatch(clearPublicProfile());
        dispatch(clearPostsAndReels());
      }

      const [profile, followersData, followingData, postData, highlightData] =
        await Promise.all([
          dispatch(getPublicProfile({userId: userID})).unwrap(),
          dispatch(fetchFollowers({userId: userID})).unwrap(),
          dispatch(fetchFollowing({userId: userID})).unwrap(),
          dispatch(getPostsAndReelsOfUser({refreshToken, userId: userID})),
          dispatch(fetchHighlightStory({userId: userID})),

          dispatch(fetchHighlightStory({userId: userID})),

          dispatch(fetchTaggedPosts(userID)),
        ]);

      // Wait for profile first to set user states
      setIsFollowing(profile.userFollowing ?? false);
      setIsBlock(profile.userBlocked ?? false);
      setLocalFollowersCount(followersData.length);
      setLocalFollowingCount(followingData.length);

      // Then wait for followers/following data
      prevUserRef.current = userID;
    } catch (error) {
      console.error('Error initializing profile:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [userID, dispatch]);

  useEffect(() => {
    initializeProfile();
  }, [initializeProfile]);

  // Reset state when component completed unmount
  useEffect(() => {
    return () => {
      dispatch(clearPublicProfile());
      setIsInitializing(true);
      dispatch(clearPostsAndReels());
    };
  }, []);
  const renderPrivateContent = () => {
    return (
      <View style={styles.privateContainer}>
        <View style={styles.lockIconContainer}>
          <Lock size={50} color={Colors[theme].text} />
        </View>
        <Text style={styles.privateTitle}>Đây là tài khoản riêng tư</Text>
        <Text style={styles.privateDescription}>
          Theo dõi tài khoản này để thấy ảnh và video của họ.
        </Text>
      </View>
    );
  };

  const [activeTab, setActiveTab] = useState('grid');

  const renderTabContent = () => {
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
      default:
        return <LoadingPlaceholder />;
    }
  };

  const LoadingPlaceholder = () => (
    <View style={[styles.content, styles.centerItem, {height: 50}]}>
      <Text style={styles.textno}>Đang tải...</Text>
    </View>
  );

  // Show loading indicator while fetching profile
  if (isInitializing || isLoadingPublicProfile || !publicProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.Header}>
          <TouchableOpacity
            style={{alignItems: 'center', paddingRight: 12}}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={Colors[theme].text} />
          </TouchableOpacity>
          <Text style={styles.headTitle}>Đang tải...</Text>
          <View style={styles.SectionRight}>
            <TouchableOpacity>
              <Ellipsis size={24} color={Colors[theme].text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[theme].text} />
        </View>
      </SafeAreaView>
    );
  }

  // Show error message if failed to load profile
  if (isErrorPublicProfile || !publicProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.Header}>
          <TouchableOpacity
            style={{alignItems: 'center', paddingRight: 12}}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={Colors[theme].text} />
          </TouchableOpacity>
          <Text style={styles.headTitle}>Lỗi</Text>
          <View style={styles.SectionRight}>
            <TouchableOpacity>
              <Ellipsis size={24} color={Colors[theme].text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {isErrorPublicProfile
              ? errorMessagePublicProfile
              : 'Không tìm thấy dữ liệu người dùng.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              dispatch(clearPublicProfile());
              dispatch(getPublicProfile({userId: userID}));
            }}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.Header}>
          <TouchableOpacity
            style={{alignItems: 'center', paddingRight: 12}}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={Colors[theme].text} />
          </TouchableOpacity>
          <Text style={styles.headTitle}>{publicProfile.handleName}</Text>
          <View style={styles.SectionRight}>
            <TouchableOpacity onPress={openOptionModal}>
              <Ellipsis size={24} color={Colors[theme].text} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Header Info */}
        <View>
          <UserInfo
            name={publicProfile.username}
            followers={localFollowersCount}
            following={localFollowingCount}
            posts={PostsItem.length + ReelsItem.length}
            avatar={publicProfile.profilePic}
            bio={publicProfile.bio}
            theme={theme}
            onFollowersPress={() => navigateToUserFollow('UserFollowersTab')}
            onFollowingPress={() => navigateToUserFollow('UserFollowingTab')}
          />
        </View>
        {/* Action Buttons */}
        <ActionButtons
          onFollowPress={toggleFollow}
          onMessagePress={handleMessagePress}
          onUnblockPress={toggleUnblock}
          theme={theme}
          isFollowing={isFollowing}
          isBlocked={isBlock}
        />
        {/* Story Highlights */}
        {!isBlock && highlightStories && highlightStories.length > 0 && (
          <HighlightStories
            highlights={highlightStories}
            showAddButton={false}
            onHighlightPress={async highlight => {
              // Tạo object với thông tin của người sở hữu highlight
              const highlightOwner = {
                _id: userID,
                handleName: publicProfile?.handleName,
                profilePic: publicProfile?.profilePic,
                username: publicProfile?.username,
              };

              // Tìm index của highlight hiện tại
              const currentHighlightIndex = highlightStories.findIndex(
                h => h._id === highlight._id,
              );

              await handleHighlightPress(
                highlight,
                dispatch,
                navigation,
                highlightOwner, // Truyền thông tin người sở hữu highlight
                false, // isOwner = false vì đây là profile của người khác
                highlightStories, // Truyền tất cả highlights
                currentHighlightIndex, // Truyền index hiện tại
              );
            }}
            onAddHighlight={() => {
              // Không làm gì vì đây là profile của người khác
              return;
            }}
          />
        )}
        {/* Posts Grid/Video Tabs */}
        {/* {!isBlock && (
          <>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                disabled={!isPrivate}
                onPress={() => {
                  setActiveTab('grid');
                }}
                style={[
                  styles.tab,
                  activeTab === 'grid' && styles.activeTab,
                  !isPrivate && { opacity: 0.5 },
                ]}>
                <Grid
                  size={26}
                  color={
                    activeTab === 'grid'
                      ? Colors[theme].text
                      : Colors.textSecondary
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!isPrivate}
                onPress={() => {
                  setActiveTab('reels');
                }}
                style={[
                  styles.tab,
                  activeTab === 'reels' && styles.activeTab,
                  !isPrivate && { opacity: 0.5 },
                ]}>
                <Video
                  size={26}
                  color={
                    activeTab === 'reels'
                      ? Colors[theme].text
                      : Colors.textSecondary
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!isPrivate}
                onPress={() => {
                  setActiveTab('tagged');
                }}
                style={[
                  styles.tab,
                  activeTab === 'tagged' && styles.activeTab,
                  !isPrivate && { opacity: 0.5 },
                ]}>
                <UserSquare2
                  size={26}
                  color={
                    activeTab === 'tagged'
                      ? Colors[theme].text
                      : Colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
            {renderTabContent()}
          </>
        )} */}
        <Portal>
          <OptionModal
            ref={modalOptionRef}
            userID={userID}
            isBlock={isBlock}
            onBlockChange={newState => setIsBlock(newState)}
          />
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileComp;

export const createStyles = (theme: 'light' | 'dark') => {
  const color = Colors[theme];
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: color.background,
    },
    header: {
      flexDirection: 'row',
      padding: 15,
      alignItems: 'center',
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    statsContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginLeft: 20,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: color.text,
    },
    statLabel: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      marginBottom: 12,
      gap: 8,
    },
    highlightsContainer: {
      padding: 15,
    },
    highlightItem: {
      alignItems: 'center',
      marginRight: 15,
    },
    highlightCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    highlightTitle: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
      color: color.text,
    },
    tabsContainer: {
      flex: 1,
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: Colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      padding: 10,
    },
    postsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    privateContainer: {
      alignItems: 'center',
      padding: 20,
      marginTop: 40,
    },
    lockIconContainer: {
      width: 80,
      height: 80,
      borderWidth: 2,
      borderColor: color.text,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    privateTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: color.text,
      marginBottom: 10,
    },
    privateDescription: {
      fontSize: 14,
      color: color.textSecondary,
      textAlign: 'center',
    },
    linkText: {
      color: Colors.blue,
      fontSize: 14,
    },
    suggestedSection: {
      padding: 15,
    },
    suggestedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    suggestedTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: color.text,
    },
    seeAllText: {
      color: Colors.blue,
      fontSize: 14,
    },
    activeTab: {
      borderBottomWidth: 1,
      borderBottomColor: color.text,
    },
    headTitle: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontSize: 20,
      fontWeight: '500',
      color: color.text,
    },
    Header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
    },
    SectionRight: {
      flex: 1,
      paddingRight: 12,
      alignItems: 'flex-end',
    },
    overlayStyle: {
      position: 'absolute' as const,
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 4,
      padding: 4,
    },
    loadingContainer: {
      backgroundColor: color.background,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: color.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: Colors.white,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 5,
    },
    centerItem: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imgNoPhoto: {
      width: 100,
      height: 150,
      resizeMode: 'contain',
      tintColor: Colors.textSecondary,
    },
    textno: {
      fontSize: 18,
      fontWeight: '500',
      color: Colors.textSecondary,
    },
  });
};
