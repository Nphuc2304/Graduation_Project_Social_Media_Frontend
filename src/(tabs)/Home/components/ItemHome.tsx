import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, FlatList, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {Portal} from 'react-native-portalize';
import Sound from 'react-native-sound';
import {ItemHomeStyles} from '../component_styles/ItemHomeStyles';
import {formatTimeAgo} from '../util';
import {AppDispatch, RootState} from '../../../../services/store';
import ModalShare from './ModalShare';
import ModalReaction from './ModalReaction';
import BottomSheetIntentionsModal from './BottomSheetIntentionsModal';
import BottomSheetOptionsModal from './BottomSheetOptionsModal';
import {
  RenderMediaItem,
  RenderMuteButton,
  RenderPagination,
} from './MediaComponent';
import {ItemHomeProps} from '../types';
import {useItemHomeState} from '../hook/useItemHomeState';
import {useItemHomeActions} from '../hook/useItemHomeActions';
import {useItemHomeModal} from '../hook/useItemHomeModal';
import {useItemHomeUtils} from '../util/itemHomeUtils';
import {useItemHomeAudio} from '../hook/useItemHomeAudio';
import {ItemHomeHeader} from './ItemHomeHeader';
import {ItemHomeActions} from './ItemHomeActions';
import {fetchCommentsByPost} from '@services/commentRedux/commentSlice';
import HashtagText from '../../../../components/HashtagText';
import {Colors} from '@assets/color/Colors';

Sound.setCategory('Playback');
const screenWidth = Dimensions.get('window').width;

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
    setSelectedPostId,
    clickableHashtags = true,
    isFollow,
  } = props;
  const navigation: any = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  const [likeLoading, setLikeLoading] = useState(false);

  const state = useItemHomeState(props);
  const actions = useItemHomeActions(props, state, isFollow);
  const modal = useItemHomeModal(actions, state, isFollow);
  const utils = useItemHomeUtils(props, state);

  useEffect(() => {
    state.setIsBookmark(isBookmarked);
  }, [isBookmarked]);

  // Get Redux like state for this specific post
  const isLikedFromRedux = useSelector((state: RootState) =>
    state.reactions.likePosts.includes(_id),
  );

  const currentUserID = useSelector((state: RootState) => state.user.user?._id);

  // Sync local state with Redux state
  useEffect(() => {
    state.setIsLiked(isLikedFromRedux);
  }, [isLikedFromRedux]);

  useItemHomeAudio(props, state.muted);

  // Initialize like count from props
  useEffect(() => {
    state.setNumLike(likeCount);
  }, [likeCount]);

  // Initialize local state from props only once
  useEffect(() => {
    state.setIsLiked(isLike);
  }, [_id]);

  const handleLikePress = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);

    try {
      await actions.handleLike();
    } finally {
      setLikeLoading(false);
    }
  }, [actions, likeLoading]);

  const handleUserPress = () => {
    if (user._id === currentUserID) console.log('This is your current proflie');
    else
      navigation.navigate('ProfileComp', {
        userID: user._id,
      });
  };

  const handleOpenComment = (postId: string, receiverId: string) => {
    dispatch(fetchCommentsByPost(postId));
    setSelectedPostId({postId, receiverId});
    sheetRef.current?.open();
  };

  const handleMediaScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    if (newIndex !== state.currentIndex) {
      state.setCurrentIndex(newIndex);
    }
  };

  return (
    <View style={ItemHomeStyles.wrapper}>
      <BottomSheetOptionsModal
        sheetRef={modal.sheetRef}
        isBookmarked={state.isBookmark}
        onBookmarkPress={actions.handleBookmarkAction}
        topOptions={modal.topOptions}
        firstListOptions={modal.firstListOptions}
        secondListOptions={modal.secondListOptions}
        onSelect={modal.handleOptionSelect}
      />

      <BottomSheetIntentionsModal
        sheetRef={modal.intentRef}
        options={modal.intentionOptions}
        onSelect={modal.handleIntentionSelect}
      />

      <View style={ItemHomeStyles.container}>
        {!utils.isReel && <View style={ItemHomeStyles.blockWhite} />}

        <View style={ItemHomeStyles.video}>
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item._id.toString()}
            renderItem={({item}) => (
              <RenderMediaItem
                item={item}
                isFocused={isFocused}
                currentVisible={currentVisible}
                muted={state.muted}
              />
            )}
            onMomentumScrollEnd={handleMediaScroll}
          />
          <RenderPagination media={media} currentIndex={state.currentIndex} />
        </View>

        <ItemHomeHeader
          user={user}
          textColor={utils.textColor}
          borderColor={utils.borderColor}
          iconTintColor={utils.iconTintColor}
          follow={isFollow}
          onUserPress={handleUserPress}
          onFollowPress={actions.handleFollowAction}
          onOptionsPress={modal.openOptions}
        />

        <RenderMuteButton
          muted={state.muted}
          setMuted={state.setMuted}
          isPostWithoutMusic={type === 'post' && !music}
        />
      </View>

      <View style={{backgroundColor: utils.color.background, padding: 10}}>
        <ItemHomeActions
          iconColor={utils.iconColor}
          likedColor={utils.likedColor}
          bookmarkColor={utils.bookmarkColor}
          isLiked={state.isLiked}
          isBookmarked={state.isBookmark}
          numLike={state.numLike}
          commentCount={commentCount}
          onLikePress={handleLikePress}
          likeDisabled={likeLoading}
          share={share}
          onCommentPress={() => handleOpenComment(_id, user._id)}
          onSharePress={modal.handleOpenShareModal}
          onBookmarkPress={actions.handleBookmarkAction}
          onReactionModalPress={modal.handleOpenReactionModal}
        />

        {caption.trim() !== '' && (
          <HashtagText
            text={caption}
            clickable={clickableHashtags}
            baseStyle={[ItemHomeStyles.title, {color: utils.iconColor}]}
            hashtagColor={Colors.hashtag}
            hashtagStyle={{fontWeight: '600'}}
          />
        )}
        <Text style={{color: utils.iconColor, fontSize: 12, marginTop: 5}}>
          {formatTimeAgo(createdAt)}
        </Text>
      </View>

      <Portal>
        <ModalShare ref={modal.modalShareRef} isDark={false} />
      </Portal>

      <Portal>
        <ModalReaction
          ref={modal.modalReactionRef}
          postId={_id}
          isLiked={state.isLiked}
        />
      </Portal>
    </View>
  );
};

export default ItemHome;
