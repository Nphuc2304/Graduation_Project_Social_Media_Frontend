import React from 'react';
import {
  FlatList,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../../util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import {useEffect, useRef, useState, useCallback} from 'react';
import {RootStackParamList} from '../../Navigation/AppNavigation';
import LinkPreview from 'react-native-link-preview';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import MessageItemComponent from './components/MessageItemComponent';
import {fetchMessages} from '../../../services/messageRedux/messageSlice';
import {Message} from '../../../services/messageRedux/messageType';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImageToR2} from '../../core/upload';
import {useUploadProgress} from '../../../services/UploadProgressManager';
import {clearMessages} from '../../../services/messageRedux/messageReducer';
import ImagePreviewModal from './components/ImagePreviewModal';
import {useSocket} from '../../../services/SocketContext';
import ActionModalMessage from './components/ActionModalMessage';
import MessageInput from './components/MessageInput';
import MessageHeader from './components/MessageHeader';
import {getRoomById} from '../../../services/roomRedux/roomSlice';
import {Room} from '../../../services/roomRedux/roomType';
import {
  getRelationShip as fetchRelation,
  updatedRoomStatus,
} from './utils/helpers';
import {fetchMyRooms, fetchMyWaitingRooms} from '@services/roomRedux/roomSlice';
import LoadingModal from '../../../components/Global/LoadingModal';
import LoadTyping from '../ChatAIBox/Components/LoadTyping';

interface ItemTyping {
  roomId: string;
  userId: string;
  username: string;
  profilePic: string;
}

export const MessageScreen = () => {
  const navigation: any = useNavigation();
  const {theme} = useTheme();
  // Remove setParams usage to prevent navigation warnings
  const color = Colors[theme];
  const dispatch = useDispatch<AppDispatch>();
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [linkPreviews, setLinkPreviews] = useState<{[key: number]: any}>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [content, setContent] = useState<Message>();
  const [relationStatus, setRelationStatus] = useState<boolean>(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [listTyping, setListTyping] = useState<ItemTyping[]>([]);

  const flatListRef = useRef<FlatList>(null);

  const route = useRoute<RouteProp<RootStackParamList, 'MessageScreen'>>();
  const {
    room: roomId,
    isWaiting = false,
    highlightMessageId,
    scrollToIndex,
  } = route?.params || {};
  const userC = useSelector((state: RootState) => state.user.user);
  const {messages, loading} = useSelector((state: RootState) => state.messages);
  const acceptedRooms = useSelector((state: RootState) => state.rooms.rooms);
  const waitingRooms = useSelector(
    (state: RootState) => state.rooms.waitingRooms,
  );

  const [originalRoom, setOriginalRoom] = useState<Room | null>(null);

  const roomFromList =
    acceptedRooms.find(r => r._id === roomId) ||
    waitingRooms.find(r => r._id === roomId);

  const fetchRoomDetail = async (roomId: string) => {
    try {
      const res = await dispatch(getRoomById(roomId)).unwrap();
      setOriginalRoom(res);
    } catch (err) {
      console.error('❌ Lỗi khi fetch room:', err);
    }
  };

  useEffect(() => {
    if (roomFromList) {
      setOriginalRoom(roomFromList);
    } else if (roomId && !originalRoom) {
      fetchRoomDetail(roomId);
    }
  }, [roomFromList, roomId]);

  const rooms = originalRoom;

  const [isWaitingAndNotCreator, setIsWaitingAndNotCreator] = useState(false);

  useEffect(() => {
    if (rooms && userC?._id) {
      const condition =
        rooms.type === 'waiting' && rooms.created_by !== userC._id;
      setIsWaitingAndNotCreator(condition);
    }
  }, [rooms, userC?._id]);

  const filteredUsers = rooms?.user_ids.filter(user => user._id !== userC?._id);
  const roomMember1 = filteredUsers?.[0];
  const roomMember2 = filteredUsers?.[1];

  const {showUploadModal, hideUploadModal, setProgress} = useUploadProgress();
  const {socket, connectToSocket, disconnectSocket} = useSocket();

  useEffect(() => {
    const checkRelation = async () => {
      if (!userC || !roomMember1) return;
      try {
        const res = await fetchRelation({
          fromUserId: userC._id,
          toUserId: roomMember1._id,
        });
        setRelationStatus(Boolean(res));
      } catch (e) {
        console.error('❌ Kiểm tra mối quan hệ thất bại:', e);
      }
    };
    checkRelation();
  }, [roomMember1, userC]);

  useEffect(() => {
    setChat([]);
    if (rooms?._id) {
      dispatch(fetchMessages({roomId: rooms._id}));
    }
  }, [rooms?._id]);

  useEffect(() => {
    setChat(messages);
  }, [messages, roomId]);

  useEffect(() => {
    connectToSocket(roomId);
    return () => disconnectSocket();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (data: Message) => {
      setChat(prev => [data, ...prev]);
      setHighlightedMessageId(null);
      // No need to set navigation params - using local state instead
    };

    const onReactionUpdated = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: Message['reactions'];
    }) => {
      setChat(prev =>
        prev.map(msg => (msg._id === messageId ? {...msg, reactions} : msg)),
      );
    };

    const onMessageDeleted = ({messageId}: {messageId: string}) => {
      setChat(prev =>
        prev.map(msg =>
          msg._id.toString() === messageId.toString()
            ? {
                ...msg,
                isDeleted: true,
                content: 'Tin nhắn đã bị thu hồi',
              }
            : msg,
        ),
      );
    };

    const onThemeUpdated = ({
      roomId: updatedRoomId,
      theme,
    }: {
      roomId: string;
      theme: string;
    }) => {
      if (updatedRoomId === roomId) {
        setOriginalRoom(prev => (prev ? {...prev, theme} : prev));
      }
    };

    const handleTyping = (item: ItemTyping) => {
      if (item.userId !== userC?._id && item.roomId === roomId) {
        setListTyping(prev => {
          if (prev.some(u => u.userId === item.userId && u.roomId === roomId))
            return prev;
          return [...prev, item];
        });
      }
    };

    const handleStopTyping = (payload: {roomId: string; userId: string}) => {
      const {roomId: rid, userId: uid} = payload;
      if (uid !== userC?._id && rid === roomId) {
        setListTyping(prev =>
          prev.filter(u => u.userId !== uid && u.roomId !== roomId),
        );
      }
    };

    socket.on('receiveMessage', onMessage);
    socket.on('reactionUpdated', onReactionUpdated);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('room:update-theme', onThemeUpdated);
    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);

    return () => {
      socket.off('receiveMessage', onMessage);
      socket.off('reactionUpdated', onReactionUpdated);
      socket.off('messageDeleted', onMessageDeleted);
      socket.off('room:update-theme', onThemeUpdated);
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
    };
  }, [socket]);

  useEffect(() => {
    chat.forEach((item, index) => {
      if (!linkPreviews[index] && item.content.match(/https?:\/\/\S+/)) {
        LinkPreview.getPreview(item.content).then(data => {
          setLinkPreviews(prev => ({...prev, [index]: data}));
        });
      }
    });
  }, [chat]);

  // Handle highlighting from search results
  useEffect(() => {
    if (highlightMessageId && chat.length > 0) {
      setHighlightedMessageId(highlightMessageId);

      // Scroll to the highlighted message if scrollToIndex is provided
      if (scrollToIndex !== undefined) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: scrollToIndex,
            animated: true,
            viewPosition: 0.5, // Center the message in the view
          });
        }, 1000); // Wait a bit for messages to load
      }

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  }, [highlightMessageId, scrollToIndex, chat]);

  const sendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && socket) {
      socket.emit('sendMessage', {
        roomId,
        content: trimmedMessage,
        senderId: userC?._id,
      });
      setMessage('');
      // Clear highlight when user sends a message
      setHighlightedMessageId(null);
    }
  }, [message, socket, roomId, userC?._id]);

  const pickImageAndSend = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets?.length) {
      const image = result.assets[0];
      const uri = image.uri;

      if (uri && socket) {
        try {
          const imageUrl = await uploadImageToR2(uri, {
            showUploadModal,
            hideUploadModal,
            setProgress,
          });

          socket.emit('sendMessage', {
            roomId,
            senderId: userC?._id,
            media: {
              type: 'image',
              url: imageUrl,
            },
          });
          // Clear highlight when user sends an image
          setHighlightedMessageId(null);
        } catch (err) {
          console.error('❌ Upload/send image error:', err);
        }
      }
    }
  }, [
    socket,
    roomId,
    userC?._id,
    showUploadModal,
    hideUploadModal,
    setProgress,
  ]);

  const handleAcceptRequest = useCallback(async () => {
    try {
      await updatedRoomStatus({roomId: rooms!._id});
      setRelationStatus(true);
      dispatch(fetchMyRooms());
      dispatch(fetchMyWaitingRooms());
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  }, [rooms, dispatch]);

  const handleGoBack = useCallback(() => {
    disconnectSocket();
    setChat([]);
    setMessage('');
    setSelectedImageUri(null);
    setLinkPreviews({});
    dispatch(clearMessages());
    setOriginalRoom(null);
    navigation.goBack();
  }, [disconnectSocket, dispatch, navigation]);

  const handleLongPress = useCallback((content: Message) => {
    setModalVisible(true);
    setContent(content);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setSelectedImageUri(null);
  }, []);

  const handleCloseActionModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  // Ref lưu timestamp lần gõ cuối
  const lastTypingAt = useRef<number>(0);
  // Ref lưu timeout ID
  const stopTypingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = (text: string) => {
    setMessage(text);

    const now = Date.now();

    if (!socket) return;

    // 1) Nếu lastTypingAt=0 → đây là lần gõ đầu tiên → emit 'typing'
    if (lastTypingAt.current === 0) {
      socket.emit('typing', {roomId: roomId, userId: userC?._id});
    }

    // 2) Cập nhật lại thời điểm gõ
    lastTypingAt.current = now;

    // 3) Huỷ timeout cũ (nếu có), đặt lại stopTyping sau 5s
    if (stopTypingTimer.current) {
      clearTimeout(stopTypingTimer.current);
    }
    stopTypingTimer.current = setTimeout(() => {
      // Nếu đã 5s mà không gõ thêm (so với lastTypingAt), emit 'stop_typing'
      if (Date.now() - lastTypingAt.current >= 5000) {
        socket.emit('stopTyping', {roomId: roomId, userId: userC?._id});
        lastTypingAt.current = 0;
      }
    }, 5000);
  };

  const renderItem = useCallback(
    ({item, index}: {item: Message; index: number}) => {
      return (
        <MessageItemComponent
          roomId={roomId}
          item={item}
          index={index}
          userHandleName={userC?.handleName ?? ''}
          chat={chat}
          setSelectedImageUri={setSelectedImageUri}
          linkPreviews={linkPreviews}
          onLongPress={handleLongPress}
          isHighlighted={highlightedMessageId === item._id}
          userC={userC}
        />
      );
    },
    [
      roomId,
      userC?.handleName,
      chat,
      linkPreviews,
      handleLongPress,
      highlightedMessageId,
    ],
  );

  const keyExtractor = useCallback((item: Message) => item._id, []);

  if (loading || !rooms) {
    return (
      <SafeAreaView
        style={[styles.loading, {backgroundColor: color.background}]}>
        <LoadingModal />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {rooms?.theme && (
        <ImageBackground
          source={{uri: rooms.theme}}
          style={styles.bg}
          resizeMode="cover"
        />
      )}
      <View
        style={[
          styles.viewDf,
          {
            backgroundColor: rooms?.theme
              ? 'rgba(0,0,0,0.1)'
              : color.background,
          },
        ]}>
        <View style={{flex: 1}}>
          <View style={{flex: 1}}>
            <MessageHeader
              user1={roomMember1}
              user2={roomMember2}
              room={rooms}
              navigation={navigation}
              handleGoBack={handleGoBack}
              userC={userC}
              showCallFeatures={!isWaiting}
              bothFollowing={relationStatus}
              messages={chat}
            />
            <FlatList
              ref={flatListRef}
              data={chat}
              renderItem={renderItem}
              inverted
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 10,
                paddingBottom: 20,
                paddingHorizontal: 10,
                flexGrow: 1,
              }}
              ListHeaderComponent={
                listTyping.length > 0 ? (
                  <LoadTyping itemLoading={listTyping} />
                ) : null
              }
            />
            {isWaitingAndNotCreator ? (
              <View style={styles.requestBanner}>
                <View style={{marginBottom: 10}}>
                  <Text style={styles.requestBannerText}>
                    Bạn cần chấp nhận lời mời trước khi trò chuyện.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    {backgroundColor: color.primary},
                  ]}
                  onPress={handleAcceptRequest}>
                  <Text style={[styles.acceptButtonText, {color: '#fff'}]}>
                    Chấp nhận lời mời
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <MessageInput
                  message={message}
                  setMessage={setMessage}
                  sendMessage={sendMessage}
                  pickImageAndSend={pickImageAndSend}
                  roomId={roomId}
                  handleChangeText={handleChangeText}
                />
              </>
            )}
          </View>
        </View>
        <ImagePreviewModal
          visible={!!selectedImageUri}
          imageUri={selectedImageUri}
          onClose={handleCloseImagePreview}
        />
        <ActionModalMessage
          visible={modalVisible}
          onClose={handleCloseActionModal}
          content={content}
          setChat={setChat}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  rowContainer1: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBanner: {
    backgroundColor: '#eef5ff',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestBannerText: {
    width: '100%',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  acceptButton: {
    elevation: 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  acceptButtonText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  callText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: 'transparent',
  },
  viewDf: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
