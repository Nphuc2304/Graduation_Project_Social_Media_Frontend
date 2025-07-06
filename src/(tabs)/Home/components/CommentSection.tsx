import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {Modalize} from 'react-native-modalize';
import {useTheme} from '../../../../src/util/ThemeContext';
import {Colors} from '../../../../assets/color/Colors';
import {FlashList} from '@shopify/flash-list';
import CommentComponent from './commentComponent';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {
  addComment,
  fetchCommentsByPost,
} from '../../../../services/commentRedux/commentSlice';
import {Send} from 'lucide-react-native';
import {Portal} from 'react-native-portalize';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import { checkProfanityAndAlert } from '../../../util/profanityFilter';
import {incrementCommentCountByPostId} from '@services/postRedux/postReducer';

export type BottomSheetCommentRef = {
  open: () => void;
  close: () => void;
};

interface Props {
  postId: string;
  receiverId?: string;
}

const height = Dimensions.get('window').height * 0.85;

const BottomSheetComment = forwardRef<BottomSheetCommentRef, Props>(
  ({postId, receiverId}, ref) => {
    const modalizeRef = useRef<Modalize>(null);
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.user.user);
    const {comments, loading} = useSelector(
      (state: RootState) => state.comment,
    );
    const {theme} = useTheme();
    const color = Colors[theme];
    const [isSending, setIsSending] = useState(false);
    const [comment, setComment] = useState('');
    const [replyTo, setReplyTo] = useState<{
      id: string;
      handleName: string;
    } | null>(null);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        modalizeRef.current?.open();
      },
      close: () => {
        modalizeRef.current?.close();
        setReplyTo(null);
        setComment('');
      },
    }));

    const handleSendComment = async () => {
      if (!comment.trim() || isSending) return;
      if (checkProfanityAndAlert(comment)) {return;}

      const payload = {
        postID: postId,
        content: comment.trim(),
        parentID: replyTo?.id || '',
        mediaUrl: null,
      };

      setIsSending(true);
      setComment('');
      setReplyTo(null);

      try {
        const res = await dispatch(
          addComment({
            payload,
            handleName: user?.handleName,
            postId: postId,
            receiverId: receiverId,
            userId: user?._id}),
        ).unwrap();

        dispatch(incrementCommentCountByPostId(postId));
        dispatch(fetchCommentsByPost(postId));
      } catch (error) {
        GlobalAlertManager.show('Thất bại', 'Không thể bình luận');
      } finally {
        setIsSending(false);
      }
    };

    return (
      <Portal>
        <Modalize
          ref={modalizeRef}
          modalStyle={{
            backgroundColor: color.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
          handleStyle={{
            backgroundColor: color.text,
            height: 6,
            width: 40,
            marginBottom: 8,
          }}
          handlePosition="inside"
          panGestureEnabled
          scrollViewProps={{scrollEnabled: false}}
          adjustToContentHeight
          keyboardAvoidingBehavior="padding"
          onClosed={() => {
            setReplyTo(null);
            setComment('');
          }}>
          <View style={{flex: 1, height: height, paddingTop: 40}}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={color.text} />
              </View>
            ) : (
              <>
                {comments.length > 0 ? (
                  <View style={{flex: 1, paddingHorizontal: 20}}>
                    <FlashList
                      data={comments}
                      renderItem={({item}) => (
                        <CommentComponent
                          _id={''}
                          content={''}
                          isDeleted={false}
                          isLiked={false}
                          createdAt={''}
                          {...item}
                          onReply={(id, handleName) => {
                            setReplyTo({id, handleName});
                            setTimeout(() => {
                              inputRef.current?.focus();
                            }, 200);
                          }}
                        />
                      )}
                      estimatedItemSize={50}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{color: color.text}}>
                      Bạn hãy là người đầu tiên bình luận
                    </Text>
                  </View>
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

                <View style={[styles.inputContainer]}>
                  <View style={styles.inputRow}>
                    <View style={styles.blockImg}>
                      <Image
                        style={styles.img}
                        source={{uri: user?.profilePic}}
                      />
                    </View>
                    <TextInput
                      ref={inputRef}
                      placeholder={
                        replyTo ? `Trả lời ${replyTo.handleName}` : 'Bình luận'
                      }
                      placeholderTextColor={color.text}
                      style={[
                        styles.input,
                        {
                          color: color.text,
                          backgroundColor: color.backgroundSecondary,
                        },
                      ]}
                      value={comment}
                      onChangeText={setComment}
                      onSubmitEditing={() => handleSendComment()}
                    />
                    {comment.length > 0 ? (
                      <TouchableOpacity
                        onPress={handleSendComment}
                        disabled={isSending}>
                        <Send
                          size={24}
                          color={isSending ? 'gray' : color.text}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.blockIcon}>
                        <Image
                          style={[styles.icon, {tintColor: color.text}]}
                          source={require('../../../../assets/icon/sticker.png')}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </Modalize>
      </Portal>
    );
  },
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibleReply: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 0.5,
    borderColor: '#ccc',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  icon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  blockIcon: {
    width: 20,
    height: 20,
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    borderRadius: 15,
    height: 40,
    marginHorizontal: 10,
  },
});

export default BottomSheetComment;
