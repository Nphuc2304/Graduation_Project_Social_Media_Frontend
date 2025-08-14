import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Vibration,
} from 'react-native';
import {Colors} from '@assets/color/Colors';
import IncomingCallModal from '../../../../components/IncomingCallModal';
import {useSocket} from '@services/SocketContext';
import {ArrowLeft, Phone, Video, AlertCircle} from 'lucide-react-native';
import {Room, RoomUser} from '@services/roomRedux/roomType';
import {User} from '@services/userRedux/userTypes';
import {useTheme} from '../../../../src/util/ThemeContext';
import CustomPopupModal, {
  CustomPopupModalRef,
} from '../../../../components/Global/CustomPopupModal';
import 'react-native-get-random-values';
import RNCallKeep from 'react-native-callkeep';
import {v4 as uuidv4} from 'uuid';

interface MessageHeaderProps {
  user1?: RoomUser;
  user2?: RoomUser;
  room: Room | null;
  navigation: any;
  handleGoBack: () => void;
  userC: User | null;
  showCallFeatures?: boolean;
  bothFollowing?: boolean;
  messages?: any[];
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  user1,
  user2,
  room,
  navigation,
  handleGoBack,
  userC,
  showCallFeatures = false,
}) => {
  const {theme} = useTheme();
  const color = Colors[theme];
  const {socket} = useSocket();
  const modalRef = useRef<CustomPopupModalRef>(null);

  const [incomingCall, setIncomingCall] = useState<{
    visible: boolean;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    type: 'video' | 'voice';
    callUUID: string;
    roomId: string;
  }>({
    visible: false,
    callerId: '',
    callerName: '',
    callerAvatar: undefined,
    type: 'video',
    callUUID: '',
    roomId: '',
  });

  const rejectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCall = () => {
    if (!room?._id || !userC || !user1) return;
    Vibration.vibrate(50);

    const callUUID = uuidv4();

    RNCallKeep.startCall(
      callUUID,
      user1.username ?? 'Người nhận',
      user1.username ?? 'Người nhận',
      'number',
      true,
    );

    socket?.emit('incomingCall', {
      callerId: userC._id,
      callerName: userC.username,
      callerAvatar: userC.profilePic,
      type: 'video',
      roomId: room._id,
      callUUID,
    });
  };

  const handleVoiceCall = () => {
    if (!room?._id || !userC || !user1) return;
    Vibration.vibrate(50);

    const callUUID = uuidv4();

    RNCallKeep.startCall(
      callUUID,
      user1.username ?? 'Người nhận',
      user1.username ?? 'Người nhận',
      'number',
      false,
    );

    socket?.emit('incomingCall', {
      callerId: userC._id,
      callerName: userC.username,
      callerAvatar: userC.profilePic,
      type: 'voice',
      roomId: room._id,
      callUUID,
    });
  };

  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({
      callerId,
      callerName,
      callerAvatar,
      type,
      callUUID,
      roomId,
    }: {
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      type: 'video' | 'voice';
      callUUID: string;
      roomId: string;
    }) => {
      RNCallKeep.displayIncomingCall(
        callUUID,
        callerName || 'Không xác định',
        callerName || 'Không xác định',
        'number',
        type === 'video',
      );

      setIncomingCall({
        visible: true,
        callerId,
        callerName,
        callerAvatar,
        type,
        callUUID,
        roomId,
      });
    };

    socket.on('incomingCall', onIncoming);
    return () => {
      socket.off('incomingCall', onIncoming);
    };
  }, [socket]);

  // Chấp nhận cuộc gọi
  const handleAcceptCall = () => {
    if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current);

    RNCallKeep.answerIncomingCall(incomingCall.callUUID);
    setIncomingCall(prev => ({...prev, visible: false}));

    navigation.navigate('ZegoCallScreen', {
      userID: incomingCall.callerId,
      userName: incomingCall.callerName,
      callID: incomingCall.roomId,
      image: incomingCall.callerAvatar,
      callType: incomingCall.type,
      isCaller: false,
    });
  };

  // Từ chối cuộc gọi
  const handleRejectCall = () => {
    if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current);
    RNCallKeep.endCall(incomingCall.callUUID);

    socket?.emit('callCancelled', {
      roomId: room?._id,
      senderId: userC?._id,
    });

    setIncomingCall(prev => ({...prev, visible: false}));
  };

  // Auto reject sau 10s
  useEffect(() => {
    if (incomingCall.visible) {
      rejectTimeoutRef.current = setTimeout(() => {
        handleRejectCall();
      }, 10000);
    }
    return () => {
      if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current);
    };
  }, [incomingCall.visible]);

  const shouldShowCallIcons =
    showCallFeatures && room?.type != 'waiting' && userC;

  return (
    <>
      <View
        style={[
          styles.header,
          {
            backgroundColor: color.backgroundSecondary,
          },
        ]}>
        <View style={styles.rowContainer2}>
          <TouchableOpacity onPress={handleGoBack}>
            <ArrowLeft size={22} color={color.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              gap: 10,
            }}
            onPress={() => {
              if (user1?.profilePic && user2?.profilePic) {
                navigation.navigate('InforGroupChat', {
                  roomId: room?._id,
                  img1: user1?.profilePic,
                  img2: user2?.profilePic,
                });
              } else {
                navigation.navigate('InfoUser', {
                  roomId: room?._id,
                  img1: user1?.profilePic,
                  nameChat: user1?.username,
                  userId: user1?._id,
                });
              }
            }}>
            <View
              style={[
                styles.imgContainer,
                {
                  overflow:
                    user1?.profilePic && !user2?.profilePic
                      ? 'hidden'
                      : undefined,
                },
              ]}>
              {user2?.profilePic && (
                <>
                  <Image
                    style={[styles.iconW, {width: 30, height: 30}]}
                    source={{uri: user1?.profilePic}}
                  />
                  <Image
                    style={[
                      styles.iconF,
                      {
                        borderColor: Colors.white,
                        backgroundColor: color.backgroundSecondary,
                      },
                    ]}
                    source={{uri: user2?.profilePic}}
                  />
                </>
              )}
              {!user2?.profilePic && user1?.profilePic && (
                <Image style={styles.img} source={{uri: user1?.profilePic}} />
              )}
            </View>

            <Text style={{color: color.text, fontSize: 16}} numberOfLines={1}>
              {room?.name?.trim() || user1?.username || 'Không xác định'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowContainer1}>
          {shouldShowCallIcons && (
            <>
              <TouchableOpacity onPress={handleVoiceCall}>
                <Phone size={22} color={color.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCall}>
                <Video size={22} color={color.text} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => modalRef.current?.open()}>
            <AlertCircle size={20} color={color.text} />
          </TouchableOpacity>
        </View>
      </View>

      <IncomingCallModal
        visible={incomingCall.visible}
        callerName={incomingCall.callerName}
        type={incomingCall.type}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      <CustomPopupModal
        ref={modalRef}
        showCancelButton
        cancelText="Huỷ"
        cancelTextColor="#007AFF"
        onCancel={() => modalRef.current?.close()}>
        <TouchableOpacity
          style={styles.destructiveButton}
          onPress={() => {
            modalRef.current?.close();
          }}>
          <Text style={[styles.destructiveText, {color: '#007AFF'}]}>
            Ẩn đoạn chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.destructiveButton}
          onPress={() => {
            modalRef.current?.close();
          }}>
          <Text style={[styles.destructiveText, {color: '#007AFF'}]}>
            Rời đoạn chat
          </Text>
        </TouchableOpacity>
      </CustomPopupModal>
    </>
  );
};

export default MessageHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  rowContainer2: {
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  imgContainer: {
    position: 'relative',
    width: 35,
    height: 35,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconW: {
    width: '75%',
    height: '75%',
    resizeMode: 'cover',
    borderRadius: 25,
    top: 0,
    left: 0,
    position: 'absolute',
  },
  iconF: {
    width: '85%',
    height: '85%',
    resizeMode: 'cover',
    borderRadius: 25,
    zIndex: 1,
    bottom: 0,
    right: 0,
    borderWidth: 2,
    position: 'absolute',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rowContainer1: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
  },
  destructiveButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
