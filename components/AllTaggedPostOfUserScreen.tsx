import React from 'react';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useCallback, useRef, useState} from 'react';
import BottomSheetComment, {
  BottomSheetCommentRef,
} from '../src/(tabs)/Home/components/CommentSection';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import ItemHome from '../src/(tabs)/Home/components/ItemHome';
import {useTheme} from '../src/util/ThemeContext';
import {Colors} from '../assets/color/Colors';

const AllTaggedPostOfUserScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {theme} = useTheme();
  const colors = Colors[theme];
  const listRef = useRef<FlatList<any>>(null);
  const sheetRef = useRef<BottomSheetCommentRef>(null);
  const isFocused = useIsFocused();

  const {targetPostId} = route.params as {targetPostId: string};
  const taggedPosts = useSelector(
    (state: RootState) => state.taggedPosts.data,
  );

  const [currentVisible, setCurrentVisible] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<{postId: string, receiverId: string}>({postId: '', receiverId: ''});

  const targetIndex = Array.isArray(taggedPosts)
    ? taggedPosts.findIndex((post: any) => post._id === targetPostId)
    : -1;

  const onViewRef = useCallback(({viewableItems}: {viewableItems: any[]}) => {
    const id = viewableItems[0]?.item?._id;
    if (id) setCurrentVisible(id);
  }, []);


  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={[styles.header, {backgroundColor: colors.background}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/icon/left.png')}
            style={[styles.iconBack, {tintColor: colors.text}]}
          />
        </TouchableOpacity>
        <Text style={[styles.title, {color: colors.text}]}>
          Tất cả bài viết
        </Text>
        <View style={styles.iconBack} />
      </View>

      <View style={{flex: 1, backgroundColor: colors.background}}>
        <FlatList
          ref={listRef}
          data={taggedPosts}
          keyExtractor={item => item._id}
          extraData={[currentVisible, isFocused]}
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
                music={item.music}
                currentVisible={shouldPlay}
                isFocused={isFocused}
                sheetRef={sheetRef}
                isFollow={item.isFollow}
                setSelectedPostId={setSelectedPostId}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          initialScrollIndex={targetIndex >= 0 ? targetIndex : 0}
          removeClippedSubviews={true}
          nestedScrollEnabled={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          getItemLayout={(_, index) => ({
            length: 500,
            offset: 500 * index,
            index,
          })}
        />
        <BottomSheetComment ref={sheetRef} postId={selectedPostId.postId} receiverId={selectedPostId.receiverId}/>
      </View>
    </SafeAreaView>
  );
};

export default AllTaggedPostOfUserScreen;

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
    width: 14,
    height: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
});
