import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Image} from 'react-native';
import {ZegoUIKitPrebuiltCall} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import {CallAppID, CallAppSign} from '../../../services/api';
import {useNavigation} from '@react-navigation/native';
import {useSocket} from '../../../services/SocketContext';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';

export default function ZegoCallScreen({route}: any) {
  const {
    selfId,
    selfName,
    peerId,
    peerName,
    callID,
    image,
    isCaller,
    callType,
  } = route.params;
  const navigation = useNavigation();
  const {socket} = useSocket();
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const handleCallEnd = () => {
    if (callEnded) return;
    setCallEnded(true);

    if (socket) {
      socket.emit('callEnded', {
        roomId: callID,
        senderId: selfId,
        callType,
        missed: false,
        duration: callDuration,
      });
    }

    navigation.goBack();
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('callEnded', handleCallEnd);
    return () => {
      socket.off('callEnded', handleCallEnd);
    };
  }, [socket]);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={CallAppID}
        appSign={CallAppSign}
        userID={selfId} // ID của chính mình
        userName={selfName}
        callID={callID}
        config={{
          turnOnCameraWhenJoining: callType === 'video',
          turnOnMicrophoneWhenJoining: true,
          useSpeakerWhenJoining: callType === 'video',
          layout: 'GROUP',
          showCameraToggleButton: callType === 'video',
          showMicrophoneToggleButton: true,
          showAudioOutputButton: true,
          showEndCallButton: true,
          onCallEnd: handleCallEnd,
          timingConfig: {
            isDurationVisible: true,
            onDurationUpdate: (duration: number) => {
              if (duration === 9 * 60 + 30) {
                GlobalAlertManager.show(
                  'Thông báo',
                  'Cuộc gọi sẽ tự động kết thúc sau 30 giây',
                );
              }
              if (duration === 10 * 60) {
                handleCallEnd();
              }
            },
          },
          avatarBuilder: ({userInfo}: {userInfo: {userID: string}}) => (
            <Image
              style={{width: '100%', height: '100%'}}
              resizeMode="cover"
              source={
                userInfo.userID === peerId && image
                  ? {uri: image}
                  : {
                      uri: 'https://i.pinimg.com/736x/09/80/62/098062ede8791dc791c3110250d2a413.jpg',
                    }
              }
            />
          ),
          scenario: {
            mode: callType === 'video' ? 'VIDEO_CALL' : 'VOICE_CALL',
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
});
