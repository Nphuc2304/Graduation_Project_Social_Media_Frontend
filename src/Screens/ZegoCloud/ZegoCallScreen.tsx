import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Image} from 'react-native';
import {ZegoUIKitPrebuiltCall} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import {CallAppID, CallAppSign} from '../../../services/api';
import {useNavigation} from '@react-navigation/native';
import {useSocket} from '../../../services/SocketContext';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';

export default function ZegoCallScreen({route}: any) {
  const {userID, userName, callID, image, isCaller} = route.params;
  const navigation = useNavigation();
  const {socket} = useSocket();
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const handleCallCancelled = () => {
    if (callEnded) return;
    setCallEnded(true);

    if (socket && isCaller) {
      socket.emit('callEnded', {
        roomId: callID,
        senderId: userID,
        callType: 'video',
        missed: false,
        duration: callDuration,
      });
    }

    navigation.goBack();
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('callCancelled', handleCallCancelled);
    return () => {
      socket.off('callCancelled', handleCallCancelled);
    };
  }, [socket]);

  useEffect(() => {
    const start = Date.now();

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - start) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={CallAppID}
        appSign={CallAppSign}
        userID={userID}
        userName={userName}
        callID={callID}
        config={{
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          useSpeakerWhenJoining: true,
          layout: 'GROUP',
          showCameraToggleButton: true,
          showMicrophoneToggleButton: true,
          showAudioOutputButton: true,
          showEndCallButton: true,
          onCallEnd: () => {
            handleCallCancelled();
          },
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
                handleCallCancelled();
              }
            },
          },
          avatarBuilder: ({userInfo}: {userInfo: {userID: string}}) => (
            <View style={{width: '100%', height: '100%'}}>
              <Image
                style={{width: '100%', height: '100%'}}
                resizeMode="cover"
                source={
                  image
                    ? {uri: image}
                    : {
                        uri: 'https://i.pinimg.com/736x/09/80/62/098062ede8791dc791c3110250d2a413.jpg',
                      }
                }
              />
            </View>
          ),
          scenario: {
            mode: 'VIDEO_CALL',
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
