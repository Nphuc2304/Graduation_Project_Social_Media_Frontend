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
import {useSocket} from '@services/SocketContext';
import {ArrowLeft, Phone, Video, AlertCircle} from 'lucide-react-native';
import {Room, RoomUser} from '@services/roomRedux/roomType';
import {User} from '@services/userRedux/userTypes';
import {useTheme} from '../../../../src/util/ThemeContext';
import CustomPopupModal, {
  CustomPopupModalRef,
} from '../../../../components/Global/CustomPopupModal';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {startOutgoingCall} from '../../../../src/core/callkeep/callkeep';

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
  const modalRef = useRef<CustomPopupModalRef>(null);
  const {socket} = useSocket();
  const [incomingCall, setIncomingCall] = useState({
    visible: false,
    callerId: '',
    callerName: '',
    callerAvatar: undefined as string | undefined,
    type: 'video' as 'video' | 'voice',
    callUUID: '',
    roomId: '',
  });

  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (data: any) => {
      if (data?.callerId !== userC?._id && data?.roomId === room?._id) {
        setIncomingCall({
          visible: true,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          type: data.type,
          callUUID: data.callUUID,
          roomId: data.roomId,
        });
      }
    };

    socket.on('incomingCall', onIncomingCall);

    return () => {
      socket.off('incomingCall', onIncomingCall);
    };
  }, [socket, userC?._id, room?._id]);

  const emitGlobal = (event: string, data: any) => {
    socket?.emit(event, data);
  };

  /** Gọi video */
  const handleCall = () => {
    if (!room?._id || !userC || !user1) return;
    Vibration.vibrate(50);

    const callUUID = startOutgoingCall({
      uuid: uuidv4(),
      callee: user1.username ?? 'Người nhận',
      hasVideo: true,
      roomId: room._id,
      selfId: userC._id,
      selfName: userC.username ?? 'Người gọi',
      calleeId: user1._id,
      calleeName: user1.username ?? 'Người nhận',
      image: user1.profilePic,
    });

    emitGlobal('incomingCall', {
      callerId: userC._id,
      callerName: userC.username,
      callerAvatar: userC.profilePic,
      type: 'video',
      roomId: room._id,
      callUUID,
      accepted: false,
    });
  };

  /** Gọi thoại */
  const handleVoiceCall = () => {
    if (!room?._id || !userC || !user1) return;
    Vibration.vibrate(50);
    const callUUID = startOutgoingCall({
      uuid: uuidv4(),
      callee: user1.username ?? 'Người nhận',
      hasVideo: false,
      roomId: room._id,
      selfId: userC._id,
      selfName: userC.username ?? 'Người gọi',
      calleeId: user1._id,
      calleeName: user1.username ?? 'Người nhận',
    });

    emitGlobal('incomingCall', {
      callerId: userC._id,
      callerName: userC.username,
      callerAvatar: userC.profilePic,
      type: 'voice',
      roomId: room._id,
      callUUID,
      accepted: false,
    });
  };

  const shouldShowCallIcons =
    showCallFeatures && room?.type !== 'waiting' && userC;

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
        </View>
      </View>

      {/* <IncomingCallModal
        visible={incomingCall.visible}
        callerName={incomingCall.callerName}
        type={incomingCall.type}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      /> */}
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
