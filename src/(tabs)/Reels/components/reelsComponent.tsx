import React, {memo, useCallback, useEffect, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../../../assets/color/Colors';
import {useNavigation} from '@react-navigation/native';
import Video from 'react-native-video';
import {Dimensions} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {
  addLikedPost,
  removeLikedPost,
} from '../../../../services/reactionRedux/reactionReducer';
import {
  likePost,
  unlikePost,
} from '../../../../services/reactionRedux/reactionSlice';
import {useTheme} from '../../../util/ThemeContext';
import {relationAction} from '@services/relationRedux/relationSlice';
import TagMarker from './TagMarker';
import {formatNumber} from '../../../../src/(tabs)/Home/util';
import HashtagText from '../../../../components/HashtagText';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height - 60;

const MemoizedTagMarker = memo(TagMarker);
const MemoizedImage = memo(Image);
const MemoizedText = memo(Text);

const ReelsComponent = memo((props: any) => {
  const {
    _id,
    caption,
    share,
    media,
    user,
    muted,
    currentVisible,
    isFocused,
    showBottomSheet,
    likeCount,
    isLike,
    commentCount,
    openComment,
    isFollow,
    openShareModal,
    setSkipReload,
  } = props;

  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const {theme} = useTheme();
  const color = Colors[theme];

  // Selectors
  const {likePosts} = useSelector((state: RootState) => state.reactions);
  const currentUser = useSelector((state: RootState) => state.user.user);
  const {refreshToken} = useSelector((state: RootState) => state.user);

  // State
  const isLikedFromRedux = useSelector((state: RootState) =>
    state.reactions.likePosts.includes(_id),
  );
  const [isLiked, setIsLiked] = useState(isLikedFromRedux);
  const [follow, setFollow] = useState(isFollow);
  const mine = useSelector((state: RootState) => state.user.user);
  const [numLike, setNumLike] = useState(likeCount);

  useEffect(() => {
    setIsLiked(isLikedFromRedux);
  }, [isLikedFromRedux]);

  useEffect(() => {
    if (isLike) {
      dispatch(addLikedPost(_id));
    } else {
      dispatch(removeLikedPost({postId: _id}));
    }
  }, [_id, isLike, dispatch]);

  useEffect(() => {
    setNumLike(likeCount);
  }, [likeCount]);

  const handleLike = useCallback(async () => {
    const action = isLiked ? unlikePost : likePost;
    const newLikeCount = isLiked ? numLike - 1 : numLike + 1;

    setIsLiked(!isLiked);
    setNumLike(newLikeCount);

    try {
      await dispatch(
        action({
          postId: _id,
          refreshToken,
          receiverId: user?._id,
          handleName: currentUser?.handleName ?? '',
          userId: currentUser?._id
        }),
      ).unwrap();

      dispatch(isLiked ? removeLikedPost({postId: _id}) : addLikedPost(_id));
    } catch (error) {
      setNumLike(likeCount);
      setIsLiked(likePosts.includes(_id));
    }
  }, [
    isLiked,
    _id,
    currentUser,
    user,
    dispatch,
    likeCount,
    likePosts,
    refreshToken,
    numLike,
  ]);

  const toggleFollow = useCallback(async () => {
    const newFollowState = !follow;
    setFollow(newFollowState);

    try {
      await dispatch(
        relationAction({
          targetId: user._id,
          senderId: mine?._id,
          handleName: mine?.handleName,
          action: newFollowState ? 'follow' : 'unfollow',
        }),
      ).unwrap();
    } catch (error) {
      setFollow(follow);
    }
  }, [follow, user._id, dispatch]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('ProfileComp', {userID: user._id});
  }, [navigation, user._id]);

  const handleTagPress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfileComp', {userID: userId});
    },
    [navigation],
  );

  // Render functions for better readability
  const renderProfileImage = useCallback(
    () =>
      user.profilePic ? (
        <MemoizedImage style={styles.img} source={{uri: user.profilePic}} />
      ) : (
        <MemoizedImage
          style={styles.img}
          source={require('../../../../assets/icon/account.png')}
        />
      ),
    [user.profilePic],
  );

  const renderFollowButton = useCallback(
    () =>
      user._id !== currentUser?._id && (
        <TouchableOpacity onPress={toggleFollow} style={styles.btnFollow}>
          <MemoizedText style={{fontSize: 14, color: Colors.white}}>
            {follow ? 'Đang theo dõi' : 'Theo dõi'}
          </MemoizedText>
        </TouchableOpacity>
      ),
    [user._id, currentUser?._id, follow, toggleFollow],
  );

  const renderActionButton = useCallback(
    (
      iconSource: any,
      count: number,
      onPress: () => void,
      tintColor?: string,
    ) => (
      <View style={[styles.sectionContainer, styles.topSection]}>
        <TouchableOpacity style={styles.iconContainer} onPress={onPress}>
          <MemoizedImage
            style={[styles.icon, tintColor ? {tintColor} : {}]}
            source={iconSource}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress}>
          <MemoizedText style={styles.textNormal}>
            {formatNumber(count || 0)}
          </MemoizedText>
        </TouchableOpacity>
      </View>
    ),
    [formatNumber],
  );

  return (
    <View style={styles.container}>
      <View style={styles.video}>
        <Video
          source={{uri: media[0]?.videoUrl}}
          resizeMode="contain"
          style={{width: '100%', height: '100%'}}
          repeat
          paused={!currentVisible || !isFocused}
          muted={muted}
          maxBitRate={0}
          progressUpdateInterval={500}
        />
        <View style={styles.tagOverlay}>
          {media[0]?.tags?.map((tag: any) => (
            <MemoizedTagMarker
              key={tag._id}
              tag={tag}
              onPress={handleTagPress}
            />
          ))}
        </View>
      </View>
      <View style={styles.bottomContainer}>
        <View style={styles.block1}>
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={styles.imgContainer}
              onPress={handleProfilePress}>
              {renderProfileImage()}
            </TouchableOpacity>
            <MemoizedText style={styles.name}>{user.handleName}</MemoizedText>
            {renderFollowButton()}
          </View>
          <HashtagText
            text={caption}
            clickable={true}
            baseStyle={styles.textNormal}
            hashtagColor={Colors.hashtag}
            hashtagStyle={{ fontWeight: '600' }}
            setSkipReload={setSkipReload} 
          />
        </View>

        <View style={styles.block2}>
          {renderActionButton(
            isLiked
              ? require('../../../../assets/icon/heart_fill.png')
              : require('../../../../assets/icon/heart.png'),
            numLike,
            handleLike,
            isLiked ? color.error : '#fff',
          )}

          {renderActionButton(
            require('../../../../assets/icon/comment.png'),
            commentCount,
            openComment,
          )}

          {renderActionButton(
            require('../../../../assets/icon/share.png'),
            share,
            openShareModal,
          )}

          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={showBottomSheet}>
              <MemoizedImage
                style={styles.icon}
                source={require('../../../../assets/icon/menu-dots-vertical.png')}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.iconMusicContainer}
              onPress={() => navigation.navigate('SaveMusic')}>
              <MemoizedImage
                style={styles.icon}
                source={require('../../../../assets/icon/musical-note.png')}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  btnFollow: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    marginLeft: 10,
    borderColor: Colors.white,
  },
  textNormal: {
    fontSize: 16,
    color: Colors.white,
    marginTop: 5,
  },
  container: {
    position: 'relative',
    width: width,
    height: height,
    backgroundColor: Colors.black,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 25,
    height: 25,
  },
  icon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    tintColor: Colors.white,
  },
  bottomContainer: {
    position: 'absolute',
    width: width,
    bottom: 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: Colors.transparent,
    zIndex: 1,
  },
  block1: {
    width: '80%',
  },
  imgContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.white,
  },
  block2: {
    flexDirection: 'column',
  },
  sectionContainer: {
    marginTop: 20,
  },
  topSection: {
    alignItems: 'center',
  },
  iconMusicContainer: {
    width: 25,
    height: 25,
    padding: 5,
    borderRadius: 2,
    borderColor: Colors.white,
    borderWidth: 1,
  },
  video: {
    flex: 1,
  },
  tagOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});

export default ReelsComponent;