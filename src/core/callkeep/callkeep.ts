import RNCallKeep, {IOptions} from 'react-native-callkeep';
import 'react-native-get-random-values';
import {navigationRef} from '../../../src/NavigationService';
import {v4 as uuidv4} from 'uuid';
import {getGlobalSocket} from '@services/SocketContext';

const options: IOptions = {
  ios: {appName: 'YourApp', supportsVideo: true},
  android: {
    alertTitle: 'Quyền gọi',
    alertDescription: 'Ứng dụng cần quyền để hiển thị cuộc gọi.',
    cancelButton: 'Huỷ',
    okButton: 'OK',
    additionalPermissions: [],
  },
};

let initialized = false;

// Lưu thông tin call hiện tại để end/ cancel
let currentCallData: {
  uuid: string;
  roomId: string;
  senderId: string;
  startTime?: number;
  isAnswered?: boolean;
} | null = null;

export async function setupCallKeep() {
  if (initialized) return;
  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);

  // Khi người nhận trả lời
  RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
    if (currentCallData) {
      currentCallData.isAnswered = true;
      currentCallData.startTime = Date.now();
    }

    navigationRef.current?.navigate('ZegoCallScreen', {
      callUUID,
      isIncoming: true,
      userID: 'remote-user-id',
      userName: 'remote-user-name',
      callID: callUUID,
      image: 'https://link-to-avatar',
      isCaller: false,
    });
  });

  // Khi kết thúc cuộc gọi
  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    if (currentCallData) {
      const duration = currentCallData.startTime
        ? Math.floor((Date.now() - currentCallData.startTime) / 1000)
        : 0;

      if (currentCallData.isAnswered) {
        // Đã trả lời => gửi callEnded
        getGlobalSocket()?.emit('callEnded', {
          roomId: currentCallData.roomId,
          senderId: currentCallData.senderId,
          missed: false,
          duration,
        });
      } else {
        // Chưa trả lời => gửi callCancelled
        getGlobalSocket()?.emit('callCancelled', {
          roomId: currentCallData.roomId,
          senderId: currentCallData.senderId,
        });
      }
    }

    RNCallKeep.endCall(callUUID);
    currentCallData = null;
  });

  initialized = true;
}

export function showIncomingCall({
  uuid = uuidv4(),
  callerName = 'Người gọi',
  handle = 'number',
  hasVideo = true,
  roomId,
  senderId,
}: {
  uuid?: string;
  callerName?: string;
  handle?: string;
  hasVideo?: boolean;
  roomId: string;
  senderId: string;
}) {
  currentCallData = {
    uuid,
    roomId,
    senderId,
    isAnswered: false,
  };
  RNCallKeep.displayIncomingCall(uuid, handle, callerName, 'generic', hasVideo);
  return uuid;
}

export function startOutgoingCall({
  uuid = uuidv4(),
  callee = 'number',
  hasVideo = true,
  roomId,
  senderId,
}: {
  uuid?: string;
  callee?: string;
  hasVideo?: boolean;
  roomId: string;
  senderId: string;
}) {
  currentCallData = {
    uuid,
    roomId,
    senderId,
    isAnswered: false,
  };
  RNCallKeep.startCall(uuid, callee, callee, 'number', hasVideo);
  return uuid;
}

export function endCall(uuid: string) {
  RNCallKeep.endCall(uuid);
}

export function endAllCalls() {
  RNCallKeep.endAllCalls();
}
