// CommentSection.tsx
import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useTheme} from '../src/util/ThemeContext';
import {Colors} from '../assets/color/Colors';
import {FlashList} from '@shopify/flash-list';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../services/store';
import {
  addComment,
  fetchCommentsByPost,
} from '../services/commentRedux/commentSlice';
import {Send} from 'lucide-react-native';
import {GlobalAlertManager} from '../components/Global/AlertModal';
import CommentComponent from '../src/(tabs)/Home/components/commentComponent';

interface Props {
  postId: string;
  receiverId?: string;
}

const {height} = Dimensions.get('window');

const CommentSection = ({postId, receiverId}: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user.user);
  const {comments, loading} = useSelector((state: RootState) => state.comment);
  const {theme} = useTheme();
  const color = Colors[theme];

  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<{
    id: string;
    handleName: string;
  } | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSendComment = async () => {
    if (!comment.trim()) return;

    const payload = {
      postID: postId,
      content: comment.trim(),
      parentID: replyTo?.id || '',
      mediaUrl: null,
    };

    try {
      await dispatch(
        addComment({
          payload,
          handleName: user?.handleName,
          postId,
          receiverId,
          userId: user?._id,
        }),
      ).unwrap();
      setComment('');
      setReplyTo(null);
      dispatch(fetchCommentsByPost(postId));
    } catch (error) {
      GlobalAlertManager.show('Thất bại', 'Không thể bình luận');
    }
  };

  // Gọi API lấy comment khi vào
  React.useEffect(() => {
    dispatch(fetchCommentsByPost(postId));
  }, [dispatch, postId]);

  return (
    <View
      style={{
        marginTop: 16,
        flex: 1,
        backgroundColor: color.card,
        paddingTop: 10,
      }}>
      <Text style={{marginLeft: 16, fontWeight: 'bold', color: color.text}}>
        Bình luận
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={color.text}
          style={{marginTop: 20}}
        />
      ) : comments.length > 0 ? (
        <View style={{flex: 1, paddingLeft: 15, paddingTop: 10}}>
          <FlashList
            data={comments}
            renderItem={({item}) => (
              <CommentComponent
                {...item}
                onReply={(id, handleName) => {
                  setReplyTo({id, handleName});
                  setTimeout(() => {
                    inputRef.current?.focus();
                  }, 200);
                }}
              />
            )}
            estimatedItemSize={10}
          />
        </View>
      ) : (
        <Text
          style={{color: color.text, textAlign: 'center', marginVertical: 16}}>
          Bạn hãy là người đầu tiên bình luận
        </Text>
      )}

      {replyTo && (
        <View
          style={[
            styles.visibleReply,
            {backgroundColor: color.backgroundSecondary},
          ]}>
          <Text style={[styles.txtReply, {color: color.text}]}>
            Đang trả lời{' '}
            <Text style={[styles.replyName, {color: color.text}]}>
              {replyTo.handleName}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>Hủy</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[styles.inputContainer, {backgroundColor: color.background}]}>
        <View style={styles.inputRow}>
          <Image style={styles.img} source={{uri: user?.profilePic}} />
          <TextInput
            ref={inputRef}
            placeholder={
              replyTo ? `Trả lời ${replyTo.handleName}` : 'Bình luận'
            }
            placeholderTextColor={color.text}
            style={[
              styles.input,
              {color: color.text, backgroundColor: color.backgroundSecondary},
            ]}
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={handleSendComment}
          />
          {comment.length > 0 ? (
            <TouchableOpacity onPress={handleSendComment}>
              <Send size={24} color={color.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default CommentSection;

const styles = StyleSheet.create({
  visibleReply: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  txtReply: {
    fontSize: 14,
  },
  replyName: {
    fontWeight: 'bold',
  },
  cancelReply: {
    fontSize: 14,
    fontWeight: '500',
    color: 'red',
  },
  inputContainer: {
    width: '100%',
    padding: 20,
    borderTopWidth: 0.5,
    borderColor: '#ccc',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  img: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
});
