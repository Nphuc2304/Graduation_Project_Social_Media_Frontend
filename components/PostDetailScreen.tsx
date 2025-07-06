import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useRoute, useNavigation, useIsFocused} from '@react-navigation/native';
import {useEffect, useRef, useState} from 'react';
import {
  BottomSheetCommentRef,
} from '../src/(tabs)/Home/components/CommentSection';
import ItemHome from '../src/(tabs)/Home/components/ItemHome';
import {useTheme} from '../src/util/ThemeContext';
import {Colors} from '../assets/color/Colors';
import axiosInstance from '@services/axiosInstance';
import CommentSection from './CommentSection';

interface RouteParams {
  postId: string;
  commentId?: string;
}

const PostDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {theme} = useTheme();
  const colors = Colors[theme];
  const isFocused = useIsFocused();

  const {postId, commentId} = route.params as RouteParams;

  const sheetRef = useRef<BottomSheetCommentRef>(null);
  const [post, setPost] = useState<any | null>(null);

  const [selectedPostId, setSelectedPostId] = useState<{
    postId: string;
    receiverId: string;
  }>({postId: '', receiverId: ''});

  useEffect(() => {
    const fetchPostById = async () => {
      try {
        const {data} = await axiosInstance.get(
          `http://cirla.io.vn/posts/${postId}`,
          {
            headers: {
              token: 'refresh',
            },
          },
        );
        setPost(data.data);
      } catch (error) {
        console.log('Lỗi lấy post:', error);
      }
    };

    fetchPostById();
  }, [postId]);

  if (!post) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={{color: colors.text}}>Đang tải bài viết...</Text>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      
      <View style={[styles.header, {backgroundColor: colors.background}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/icon/left.png')}
            style={[styles.iconBack, {tintColor: colors.text}]}
          />
        </TouchableOpacity>
        <Text style={[styles.title, {color: colors.text}]}>Chi tiết bài viết</Text>
        <View style={styles.iconBack} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled">
        
        <ItemHome
          _id={post._id}
          type={post.type}
          caption={post.caption}
          createdAt={post.createdAt}
          media={post.media}
          user={post.user}
          isLike={post.isLike}
          isBookmarked={post.isBookmarked}
          commentCount={post.commentCount}
          likeCount={post.likeCount}
          share={post.share}
          music={post.music}
          currentVisible={true}
          isFocused={isFocused}
          sheetRef={sheetRef}
          isFollow={post.isFollow}
          setSelectedPostId={setSelectedPostId}
        />

        <CommentSection
          postId={post._id}
          receiverId={post.user?._id}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

};

export default PostDetailScreen;

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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});