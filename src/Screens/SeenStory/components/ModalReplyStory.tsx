import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {shareStory} from '../../../../services/StoryRedux/StorySlice';
import {
  createRoom,
  fetchMyRooms,
} from '../../../../services/roomRedux/roomSlice';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import {X, Send, MessageCircle} from 'lucide-react-native';
import {Colors} from '../../../../assets/color/Colors';
import {useTheme} from '../../../util/ThemeContext';

const {width, height} = Dimensions.get('window');

interface ModalReplyStoryProps {
  storyData?: {
    _id: string;
    mediaUrl: string;
    type: 'image' | 'video';
  };
  creatorId?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface ModalReplyHandle {
  open: () => void;
  close: () => void;
}

const ModalReplyStory = forwardRef<ModalReplyHandle, ModalReplyStoryProps>(
  ({storyData, creatorId, onOpen, onClose}, ref) => {
    const {theme} = useTheme();
    const color = Colors[theme];
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const dispatch = useDispatch<AppDispatch>();
    const currentUserId = useSelector(
      (state: RootState) => state.user.user?._id,
    );
    const existingRooms = useSelector((state: RootState) => state.rooms.rooms);

    // Auto focus when modal becomes visible
    useEffect(() => {
      if (visible) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [visible]);

    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true);
        onOpen?.();
        // Focus will be handled by useEffect when visible becomes true
      },
      close: () => {
        setVisible(false);
        setMessage('');
        onClose?.();
      },
    }));

    const findExistingRoom = (creatorId: string, currentUserId: string) => {
      return existingRooms.find(room => {
        // Check if room has exactly 2 users and includes both creator and current user
        if (room.user_ids.length !== 2) return false;

        const userIds = room.user_ids.map(user => user._id);
        return userIds.includes(creatorId) && userIds.includes(currentUserId);
      });
    };

    const handleSendReply = async () => {
      if (!message.trim() || !storyData || !creatorId || !currentUserId) {
        GlobalAlertManager.show('Lỗi', 'Vui lòng nhập tin nhắn');
        return;
      }

      setIsSending(true);
      try {
        let roomId: string;

        // Check if room already exists between current user and creator
        const existingRoom = findExistingRoom(creatorId, currentUserId);

        if (existingRoom) {
          // Use existing room
          roomId = existingRoom._id;
        } else {
          // Create new room
          const roomResponse = await dispatch(
            createRoom({
              user_ids: [creatorId],
              type: 'waiting',
              name: '',
            }),
          ).unwrap();

          roomId = roomResponse.room._id;

          // Refresh rooms list to include the new room
          await dispatch(fetchMyRooms());
        }

        // Now send the story message to the room
        const payload = {
          roomIds: [roomId], // Use the actual room ID
          message: message.trim(),
          media: {
            type: storyData.type || 'image',
            url: storyData.mediaUrl,
          },
        };

        await dispatch(shareStory(payload)).unwrap();

        // Close modal and reset
        setVisible(false);
        setMessage('');
        onClose?.();
      } catch (error: any) {
        console.error('Error sending reply:', error);
        GlobalAlertManager.show(
          'Lỗi',
          error?.message || error || 'Không thể gửi reply story',
        );
      } finally {
        setIsSending(false);
      }
    };

    const handleClose = () => {
      setVisible(false);
      setMessage('');
      onClose?.();
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
            }}>
            <View
              style={{
                backgroundColor: color.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 24,
                paddingBottom: Platform.OS === 'ios' ? 50 : 24,
                minHeight: height * 0.35,
                maxHeight: height * 0.6,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: -4,
                },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                  paddingBottom: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border || '#f0f0f0',
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MessageCircle
                    size={20}
                    color={color.primary}
                    style={{marginRight: 8}}
                  />
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: color.text,
                    }}>
                    Reply Story
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: color.backgroundSecondary,
                  }}>
                  <X size={20} color={color.text} />
                </TouchableOpacity>
              </View>

              {/* Input Section */}
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 24,
                  paddingTop: 24,
                  paddingBottom: 16,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    backgroundColor: color.backgroundSecondary,
                    borderRadius: 24,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    minHeight: 56,
                    borderWidth: 1,
                    borderColor: message.trim() ? color.primary : 'transparent',
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                  <TextInput
                    ref={inputRef}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: color.text,
                      maxHeight: 120,
                      paddingVertical: 8,
                      lineHeight: 22,
                    }}
                    placeholder="Nhập tin nhắn reply story..."
                    placeholderTextColor={color.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    autoFocus={true}
                    blurOnSubmit={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendReply}
                    keyboardType="default"
                    autoCapitalize="sentences"
                  />
                  <TouchableOpacity
                    onPress={handleSendReply}
                    disabled={!message.trim() || isSending}
                    style={{
                      marginLeft: 12,
                      padding: 12,
                      borderRadius: 24,
                      backgroundColor: message.trim()
                        ? color.primary
                        : color.backgroundSecondary,
                      opacity: isSending ? 0.7 : 1,
                      shadowColor: message.trim()
                        ? color.primary
                        : 'transparent',
                      shadowOffset: {
                        width: 0,
                        height: 2,
                      },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: message.trim() ? 4 : 0,
                    }}>
                    {isSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Send size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Helper Text */}
                <Text
                  style={{
                    fontSize: 12,
                    color: color.textSecondary,
                    marginTop: 12,
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}>
                  Tin nhắn sẽ được gửi đến người đăng story
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

export default ModalReplyStory;
