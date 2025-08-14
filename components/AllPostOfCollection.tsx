import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useCallback, useEffect, useRef, useState} from 'react';
import BottomSheetComment, {
  BottomSheetCommentRef,
} from '../src/(tabs)/Home/components/CommentSection';
import ItemHome from '../src/(tabs)/Home/components/ItemHome';
import {useDispatch} from 'react-redux';
import {
  clearSearchResults,
  getSimilarPost,
} from '../services/searchRedux/searchSlice';
import {clearPosts, clearReels} from '../services/searchRedux/searchReducer';
import {useTheme} from '../src/util/ThemeContext';
import {Colors} from '../assets/color/Colors';
import {AppDispatch} from '../services/store';
import {PostWithMedia} from '@services/postRedux/postTypes';
import {ArrowLeft} from 'lucide-react-native';
import {Item} from '@services/searchRedux/searchType';
import {useHeadAlert} from './Global/HeadAlertProvider';

interface RouteParams {
  posts: PostWithMedia[];
  targetPostId: string;
  playlistName: string;
  clickableHashtag?: boolean;
  clearSearchRedux?: boolean;
  isSimilar?: boolean;
}

const AllPostOfCollectionContent = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {theme} = useTheme();
  const colors = Colors[theme];
  const isFocused = useIsFocused();
  const {showAlert} = useHeadAlert();

  const {
    posts,
    targetPostId,
    playlistName,
    clickableHashtag = true,
    clearSearchRedux = true,
    isSimilar = false,
  } = route.params as RouteParams;
  const dispatch = useDispatch<AppDispatch>();

  const listRef = useRef<FlatList<any>>(null);
  const sheetRef = useRef<BottomSheetCommentRef>(null);

  const [currentVisible, setCurrentVisible] = useState<string | null>(null);
  const selectedPostRef = useRef<{postId: string; receiverId: string}>({
    postId: '',
    receiverId: '',
  });
  const [postList, setPostList] = useState<PostWithMedia[]>(posts);
  const [isLoadSimilar, setIsLoadSimilar] = useState(false);
  const [pageSimilar, setPageSimilar] = useState(1);
  const [maxPage, setMaxPage] = useState(0);
  const targetIndex = posts.findIndex(p => p._id === targetPostId);

  const onViewRef = useCallback(
    ({viewableItems}: {viewableItems: any[]}) => {
      const id = viewableItems[0]?.item?._id;
      if (id) setCurrentVisible(id);
    },
    [postList],
  );

  useEffect(() => {
    return () => {
      if (clearSearchRedux) {
        dispatch(clearSearchResults());
        dispatch(clearPosts());
        dispatch(clearReels());
      }
    };
  }, [clearSearchRedux, dispatch]);

  useEffect(() => {
    if (isSimilar) {
      setIsLoadSimilar(true);
      dispatch(getSimilarPost({postId: targetPostId, page: pageSimilar}))
        .unwrap()
        .then(res => {
          setPostList(res.items);
          setPageSimilar(prev => prev + 1);
          setMaxPage(res.pagination.totalPages);
          setIsLoadSimilar(false);
        })
        .catch(() => {
          showAlert('Lỗi', 'Tải bài viết thất bại.');
          navigation.goBack();
        });
    }
  }, [isSimilar]);

  const handleFollowChange = (userId: string, isFollow: boolean) => {
    setPostList(prev =>
      prev.map(post =>
        post.user._id === userId
          ? {...post, isFollow, user: {...post.user}} // nếu cần cập nhật cả user.isFollow
          : post,
      ),
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={[styles.header, {backgroundColor: colors.background}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, {color: colors.text}]}>{playlistName}</Text>
        <View style={styles.iconBack} />
      </View>

      {isSimilar && isLoadSimilar && postList.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}>
          <ActivityIndicator size={'large'} color={colors.primary} />
        </View>
      ) : (
        <View style={{flex: 1, backgroundColor: colors.background}}>
          <FlatList
            ref={listRef}
            data={postList.filter(p => p.media && p.media.length > 0)}
            keyExtractor={item => item._id}
            extraData={{currentVisible, isFocused}}
            onViewableItemsChanged={onViewRef}
            viewabilityConfig={{itemVisiblePercentThreshold: 100}}
            renderItem={({item}) => {
              const shouldPlay = item._id === currentVisible;
              return (
                <ItemHome
                  _id={item._id}
                  type={item.type}
                  caption={item.caption}
                  createdAt={item.createdAt}
                  media={item.media}
                  user={item.user}
                  isLike={item.isLike}
                  isBookmarked={item.isBookmarked}
                  commentCount={item.commentCount}
                  likeCount={item.likeCount}
                  share={item.share}
                  musicInfo={item.musicInfo}
                  music={item.music}
                  currentVisible={shouldPlay}
                  isFocused={isFocused}
                  sheetRef={sheetRef}
                  isFollow={item.isFollow}
                  SelectedPostRef={selectedPostRef}
                  clickableHashtags={clickableHashtag}
                  onFollowChange={handleFollowChange}
                  setDeleteMyPost={postId => {
                    if (postList.length === 1 && postList[0]._id === postId)
                      navigation.goBack();
                    setPostList(prev => prev.filter(i => i._id !== postId));
                  }}
                />
              );
            }}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={targetIndex >= 0 ? targetIndex : 0}
            removeClippedSubviews={true}
            maintainVisibleContentPosition={{minIndexForVisible: 0}}
            getItemLayout={(_, index) => ({
              length: 500,
              offset: 500 * index,
              index,
            })}
            onEndReached={() => {
              if (isSimilar && !(pageSimilar > maxPage)) {
                setIsLoadSimilar(true);
                dispatch(
                  getSimilarPost({postId: targetPostId, page: pageSimilar}),
                )
                  .unwrap()
                  .then(res => {
                    setPostList([...postList, ...res.items]);
                    setPageSimilar(prev => prev + 1);
                    setIsLoadSimilar(false);
                  })
                  .catch(() => {
                    showAlert('Thông báo', 'Tải bài viết thất bại.');
                  });
              }
            }}
            onEndReachedThreshold={0.2}
            ListFooterComponent={isLoadSimilar ? (<ActivityIndicator size={'small'} color={colors.primary} />) : null}
          />
          <BottomSheetComment
            ref={sheetRef}
            selectedPostRef={selectedPostRef}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default AllPostOfCollectionContent;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  iconBack: {
    width: 22,
    height: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
});
