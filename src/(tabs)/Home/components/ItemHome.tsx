import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, FlatList, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {Portal} from 'react-native-portalize';
import Sound from 'react-native-sound';
import {ItemHomeStyles} from '../component_styles/ItemHomeStyles';
import {formatTimeAgo, handleDeleteMyPost} from '../util';
import {AppDispatch, RootState} from '../../../../services/store';
import ModalReaction from './ModalReaction';
import BottomSheetIntentionsModal from './BottomSheetIntentionsModal';
import {
  RenderMediaItem,
  RenderMuteButton,
  RenderPagination,
} from './MediaComponent';
import {ItemHomeProps, User} from '../types';
import {fetchCommentsByPost} from '@services/commentRedux/commentSlice';
import HashtagText from '../../../../components/HashtagText';
import {Colors} from '@assets/color/Colors';
import CustomBottomSheetOptions, {
  CustomBottomSheetOptionsRef,
} from './BottomSheetOptionsModal';
import {
  addLikedPost,
  removeLikedPost,
} from '@services/reactionRedux/reactionReducer';
import {
  likePost,
  unlikePost,
} from '../../../../services/reactionRedux/reactionSlice';
import {hidePost} from '../../../../services/postRedux/postSlice';
import {handleFollowToggle, handleBookmark} from '../util';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import {
  postTopOptions,
  postFirstList,
  postSecondList,
  reportChoices,
  icons,
} from '../../../config/postOptions';
import {useTheme} from '../../../util/ThemeContext';
import {ItemHomeHeader} from './ItemHomeHeader';
import {ItemHomeActions} from './ItemHomeActions';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from 'src/Navigation/AppNavigation';
import {selectItemHomeData} from '../selectors/homeSelectors';
import {useItemHomeAudio} from '../hook/useItemHomeAudio';
import {useHeadAlert} from '../../../../components/Global/HeadAlertProvider';
import {reportPost} from '@services/reportPost/reportSlice';
import ModalOtherReport, {ModalOtherReportHandle} from './ModalOtherReport';
import ImagePreviewModal from '../../../../src/Screens/Message/components/ImagePreviewModal';

Sound.setCategory('Playback');
const screenWidth = Dimensions.get('window').width;
type ProfileCompNav = StackNavigationProp<RootStackParamList, 'ProfileComp'>;

const ItemHome = (props: ItemHomeProps) => {
  const {
    _id,
    type,
    caption,
    createdAt,
    media,
    user,
    sheetRef,
    isFocused,
    currentVisible,
    isLike,
    isBookmarked,
    commentCount,
    likeCount,
    share,
    music,
    SelectedPostRef,
    clickableHashtags = true,
    isFollow,
    onFollowChange,
    musicInfo,
    setDeleteMyPost,
  } = props;

  const navigation = useNavigation<ProfileCompNav>();
  const dispatch = useDispatch<AppDispatch>();
  const {showAlert} = useHeadAlert();

  const {refreshToken, userID, username} = useSelector(selectItemHomeData);

  // UI state
  const [muted, setMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(isLike);
  const [numLike, setNumLike] = useState(likeCount);
  const [isBookmark, setIsBookmark] = useState(!!isBookmarked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // music
  useItemHomeAudio(props, muted);
  const hasMusic = useMemo(() => {
    const hasMusicInfo = musicInfo && Object.keys(musicInfo).length > 0;
    const hasMusicData = music && Object.keys(music).length > 0;
    return hasMusicInfo || hasMusicData;
  }, [musicInfo, music]);

  // Modal ref
  const optionSheetRef = useRef<CustomBottomSheetOptionsRef>(null);
  const intentRef = useRef<CustomBottomSheetOptionsRef>(null);
  const modalReactionRef = useRef<CustomBottomSheetOptionsRef>(null);
  const otherReportRef = useRef<ModalOtherReportHandle>(null);

  // Action handlers
  const pendingLikeRequest = useRef<Promise<any> | null>(null);

  const handleLike = useCallback(async () => {
    if (pendingLikeRequest.current) {
      try {
        await pendingLikeRequest.current;
      } catch {}
    }
    const shouldLike = !isLiked;
    if (shouldLike) {
      dispatch(addLikedPost(_id));
      setNumLike(prev => prev + 1);
    } else {
      removeLikedPost(_id);
      setNumLike(prev => prev - 1);
    }
    const requestPromise = dispatch(
      (shouldLike ? likePost : unlikePost)({
        postId: _id,
        refreshToken,
        receiverId: user._id,
        handleName: username ?? '',
        userId: userID,
      }),
    ).unwrap();
    pendingLikeRequest.current = requestPromise;
    try {
      await requestPromise;
    } catch {
      if (!shouldLike) {
        dispatch(addLikedPost(_id));
      } else {
        removeLikedPost(_id);
      }
      setNumLike(likeCount);
    } finally {
      pendingLikeRequest.current = null;
    }
  }, [isLiked, _id, refreshToken, userID, user._id, username, dispatch]);

  const handleLikePress = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      await handleLike();
    } finally {
      setLikeLoading(false);
    }
  }, [handleLike, likeLoading]);

  const handleHidePost = useCallback(() => {
    dispatch(hidePost(_id))
      .unwrap()
      .then(() => {
        if (setDeleteMyPost) setDeleteMyPost(_id);
        showAlert('Thành công', 'Ẩn bài viết thành công');
      })
      .catch(() => GlobalAlertManager.show('Thất bại', 'Ẩn bài viết lỗi'));
  }, [_id, dispatch]);

  const handleFollowAction = useCallback(
    (mine: User) => {
      handleFollowToggle({
        userId: user._id,
        follow: isFollow,
        senderId: mine?._id,
        handleName: mine?.username,
        dispatch,
        onFollowChange,
      });
    },
    [user._id, isFollow, dispatch],
  );

  const handleBookmarkAction = useCallback(() => {
    handleBookmark({
      isBookmarked: isBookmark,
      _id,
      refreshToken,
      setIsBookmarked: setIsBookmark,
      dispatch,
    });
  }, [isBookmark, _id, refreshToken, dispatch]);

  const handleDeletePost = useCallback(() => {
    handleDeleteMyPost({
      postId: _id,
      dispatch,
      showAlert,
      setDeleteMyPost,
    });
  }, [_id, refreshToken, dispatch]);

  // Modal actions
  const openOptions = useCallback(() => optionSheetRef.current?.open(), []);
  const openIntentions = useCallback(() => intentRef.current?.open(), []);
  const handleOpenReactionModal = useCallback(
    () => modalReactionRef.current?.open(),
    [],
  );
  const handleCloseImagePreview = useCallback(() => {
    setSelectedImageUri(null);
  }, []);

  // Option logic
  const handleOptionSelect = useCallback(
    (id: string) => {
      switch (id) {
        case 'hide':
          handleHidePost();
          break;
        case 'unfollow':
          handleFollowAction(user);
          break;
        case 'report':
          openIntentions();
          break;
        case 'bookmark':
          handleBookmarkAction();
          break;
      }
      optionSheetRef.current?.close();
    },
    [
      handleHidePost,
      handleFollowAction,
      handleBookmarkAction,
      openIntentions,
      user,
    ],
  );

  const handleIntentionSelect = useCallback(
    (label: string, description?: string) => {
      if (label !== 'other') {
        dispatch(reportPost({targetId: _id, reason: label}))
          .unwrap()
          .then(() => {
            showAlert(
              'Thành công',
              'Bài viết này sẽ được báo cáo và kiểm duyệt.',
            );
            handleHidePost();
            intentRef.current?.close();
          })
          .catch(() => {
            showAlert('Thất bại', 'Có lỗi xảy ra khi báo cáo.');
          });
      } else {
        otherReportRef.current?.open();
      }
    },
    [],
  );

  // Memo options
  const topOptions = useMemo(
    () =>
      postTopOptions.map(opt => ({
        ...opt,
        onPress: () => handleOptionSelect(opt.id),
      })),
    [handleOptionSelect],
  );
  const firstListOptions = useMemo(
    () =>
      postFirstList.map(opt => ({
        ...opt,
        label:
          opt.id === 'unfollow'
            ? isFollow
              ? 'Bỏ theo dõi'
              : 'Theo dõi'
            : opt.label,
        icon:
          opt.id === 'unfollow'
            ? isFollow
              ? icons.unfollow
              : icons.follow
            : opt.icon,
        onPress: () => handleOptionSelect(opt.id),
      })),
    [isFollow, handleOptionSelect],
  );
  const secondListOptions = useMemo(
    () =>
      postSecondList.map(opt => ({
        ...opt,
        onPress: () => handleOptionSelect(opt.id),
      })),
    [handleOptionSelect],
  );
  const intentionOptions = useMemo(
    () =>
      reportChoices.map(opt => ({
        ...opt,
        onPress: () => handleIntentionSelect(opt.id),
      })),
    [handleIntentionSelect],
  );

  // THEME
  const {theme} = useTheme();
  const color = Colors[theme];
  const isReel = type === 'reel';
  const textColor = isReel ? Colors.dark.text : color.text;
  const borderColor = isReel ? Colors.light.background : color.text;
  const iconTintColor = isReel ? Colors.light.background : color.text;
  const iconColor = color.text;
  const likedColor = isLiked ? color.error : iconColor;
  const bookmarkColor = isBookmark ? '#F2C641' : iconColor;

  // Media FlatList
  const handleMediaScroll = useCallback(
    (event: any) => {
      const newIndex = Math.round(
        event.nativeEvent.contentOffset.x / screenWidth,
      );
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    },
    [currentIndex],
  );

  const renderPostItem = useCallback(
    ({item, index}: {item: any; index: number}) => (
      <RenderMediaItem
        item={item}
        isFocused={isFocused}
        currentVisible={currentVisible && currentIndex === index}
        muted={muted}
        setSelectedImageUri={setSelectedImageUri}
      />
    ),
    [isFocused, currentVisible, currentIndex, muted],
  );

  // Handle open comment
  const currentUserID = useSelector(
    (state: RootState) => state.user?.user?._id,
  );
  const handleUserPress = useCallback(() => {
    if (user._id !== currentUserID) {
      navigation.navigate('ProfileComp', {userID: user._id});
    }
  }, [user._id, currentUserID, navigation]);

  const handleOpenComment = useCallback(() => {
    try {
      dispatch(fetchCommentsByPost(_id));
      if (SelectedPostRef && SelectedPostRef.current !== undefined) {
        SelectedPostRef.current = {postId: _id, receiverId: user._id};
      } else if (SelectedPostRef) {
        // Initialize if current is undefined
        SelectedPostRef.current = {postId: _id, receiverId: user._id};
      }
      sheetRef?.current?.open();
    } catch (error) {
      console.error('Error opening comment:', error);
    }
  }, [dispatch, SelectedPostRef, sheetRef, _id, user._id]);

  // Sync like/bookmark state from redux/props
  const isLikedFromRedux = useSelector((state: RootState) =>
    state.reactions.likePosts.includes(_id),
  );
  useEffect(() => {
    setIsBookmark(!!isBookmarked);
  }, [isBookmarked]);
  useEffect(() => {
    setIsLiked(isLikedFromRedux);
  }, [isLikedFromRedux]);
  useEffect(() => {
    setNumLike(likeCount);
  }, [likeCount]);
  useEffect(() => {
    if (isLike) dispatch(addLikedPost(_id));
    else dispatch(removeLikedPost(_id));
  }, [isLike, _id, dispatch]);

  // --------- UI ----------
  return (
    <View style={ItemHomeStyles.wrapper}>
      {/* Option Modal */}
      <CustomBottomSheetOptions
        ref={optionSheetRef}
        isBookmarked={isBookmark}
        topOptions={topOptions}
        isCurrentUser={userID === user._id}
        firstListOptions={firstListOptions}
        secondListOptions={secondListOptions}
        onDeleteMyPost={handleDeletePost}
        onBookmarkPress={handleBookmarkAction}
      />

      {/* Report/Intentions Modal */}
      <BottomSheetIntentionsModal
        ref={intentRef}
        options={intentionOptions}
        onSelect={handleIntentionSelect}
      />

      {/* Main Card */}
      <View style={ItemHomeStyles.container}>
        {!isReel && <View style={ItemHomeStyles.blockWhite} />}
        <View style={ItemHomeStyles.video}>
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item._id.toString()}
            renderItem={renderPostItem}
            onMomentumScrollEnd={handleMediaScroll}
          />
          <RenderPagination media={media} currentIndex={currentIndex} />
        </View>
        <ItemHomeHeader
          user={user}
          textColor={textColor}
          borderColor={borderColor}
          iconTintColor={iconTintColor}
          follow={isFollow}
          onUserPress={handleUserPress}
          onFollowPress={handleFollowAction}
          onOptionsPress={openOptions}
          musicInfo={musicInfo}
        />
        <RenderMuteButton
          muted={muted}
          setMuted={setMuted}
          isPostWithoutMusic={type === 'post' && !hasMusic}
        />
      </View>

      <View style={{backgroundColor: color.background, padding: 10}}>
        <ItemHomeActions
          iconColor={iconColor}
          likedColor={likedColor}
          bookmarkColor={bookmarkColor}
          isLiked={isLiked}
          isBookmarked={isBookmark}
          numLike={numLike}
          commentCount={commentCount}
          onLikePress={handleLikePress}
          likeDisabled={likeLoading}
          share={share}
          onCommentPress={handleOpenComment}
          onBookmarkPress={handleBookmarkAction}
          onReactionModalPress={handleOpenReactionModal}
          shareUrl={`https://cirla.io.vn/share/${_id}`}
        />
        {!!caption?.trim() && (
          <HashtagText
            text={caption}
            clickable={clickableHashtags}
            baseStyle={[ItemHomeStyles.title, {color: iconColor}]}
            hashtagColor={Colors.hashtag}
            hashtagStyle={{fontWeight: '600'}}
            navigation={navigation}
          />
        )}
        <Text style={{color: iconColor, fontSize: 12, marginTop: 5}}>
          {formatTimeAgo(createdAt)}
        </Text>
      </View>

      <Portal>
        <ImagePreviewModal
          visible={!!selectedImageUri}
          imageUri={selectedImageUri}
          onClose={handleCloseImagePreview}
        />
        <ModalReaction ref={modalReactionRef} postId={_id} isLiked={isLiked} />
        <ModalOtherReport
          ref={otherReportRef}
          onSubmit={desc => {
            dispatch(
              reportPost({targetId: _id, reason: 'OTHER', description: desc}),
            )
              .unwrap()
              .then(() => {
                showAlert(
                  'Thành công',
                  'Bài viết sẽ được báo cáo và kiểm duyệt.',
                );
                handleHidePost();
                otherReportRef.current?.close();
              })
              .catch(() => {
                showAlert('Thất bại', 'Có lỗi xảy ra khi báo cáo.');
              });
          }}
        />
      </Portal>
    </View>
  );
};

function areEqual(prev: any, next: any) {
  return (
    prev._id === next._id &&
    prev.currentVisible === next.currentVisible &&
    prev.isFocused === next.isFocused &&
    prev.isLike === next.isLike &&
    prev.isBookmarked === next.isBookmarked &&
    prev.likeCount === next.likeCount &&
    prev.commentCount === next.commentCount &&
    prev.caption === next.caption &&
    prev.share === next.share &&
    prev.type === next.type &&
    prev.isFollow === next.isFollow &&
    prev.media === next.media &&
    prev.user._id === next.user._id &&
    prev.user.profilePic === next.user.profilePic &&
    prev.music === next.music
  );
}
export default React.memo(ItemHome, areEqual);
