import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation, useIsFocused} from '@react-navigation/native';
import {useEffect, useRef, useState} from 'react';
import BottomSheetComment, {
  BottomSheetCommentRef,
} from '../src/(tabs)/Home/components/CommentSection';
import ItemHome from '../src/(tabs)/Home/components/ItemHome';
import {useTheme} from '../src/util/ThemeContext';
import {Colors} from '../assets/color/Colors';
import axiosInstance from '@services/axiosInstance';
import {ArrowLeft} from 'lucide-react-native';

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

  const {postId} = route.params as RouteParams;

  const [post, setPost] = useState<any | null>(null);
  const [isError, setIsError] = useState(false);
  const sheetRef = useRef<BottomSheetCommentRef>(null);
  const selectedPostRef = useRef<{postId: string; receiverId: string}>({
    postId: '',
    receiverId: '',
  });

  useEffect(() => {
    const fetchPostById = async () => {
      try {
        const {data} = await axiosInstance.get(`/posts/${postId}`, {
          headers: {
            token: 'refresh',
          },
        });
        setPost(data.data);
      } catch (error) {
        console.warn('Lỗi khi fetch post:', error);
        setIsError(true);
        setPost(null);
      }
    };
    fetchPostById();
  }, [postId]);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <View style={[styles.header, {backgroundColor: colors.background}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, {color: colors.text}]}>
            Chi tiết bài viết
          </Text>
          <View style={styles.iconBack} />
        </View>

        {!post ? (
          <SafeAreaView style={styles.centeredContainer}>
            {isError ? (
              <Text style={{color: colors.text}}>
                Bài viết này đã bị ẩn hoặc không tồn tại
              </Text>
            ) : (
              <ActivityIndicator size={'large'} color={colors.primary} />
            )}
          </SafeAreaView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <ItemHome
              {...post}
              currentVisible={true}
              isFocused={isFocused}
              sheetRef={sheetRef}
              SelectedPostRef={selectedPostRef}
            />
          </ScrollView>
        )}

        {/* ✅ BottomSheet comment giống Home */}
        <BottomSheetComment ref={sheetRef} selectedPostRef={selectedPostRef} />
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
    elevation: 4,
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
