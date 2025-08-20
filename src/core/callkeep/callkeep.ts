import RNCallKeep, {IOptions} from 'react-native-callkeep';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {navigationRef} from '../../NavigationService';
import {Socket} from 'socket.io-client';
import {startKeepAlive, stopKeepAlive} from '../../../src/native/KeepAlive';

type CallType = 'video' | 'voice';

type CurrentCallData = {
  uuid: string;
  roomId: string;
  selfId: string;
  selfName: string;
  peerId: string;
  peerName: string;
  image?: string;
  callType: CallType;
  isCaller: boolean;
  isAnswered?: boolean;
  startTime?: number;
};

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

let currentCallData: CurrentCallData | null = null;
let callkeepUserId: string | null = null;
let socketInstance: Socket | null = null;
let initialized = false;

// 🔹 Export setter để Provider bơm socket vào
export function setCallKeepSocket(s: Socket | null) {
  // gỡ listener cũ nếu có
  if (socketInstance) {
    socketInstance.off('callAccepted', onCallAccepted);
    socketInstance.off('callEnded', onCallEnded);
  }
  socketInstance = s;
  if (s) {
    s.on('callAccepted', onCallAccepted);
    s.on('callEnded', onCallEnded);
  }
}

export function setCallKeepUserId(id: string) {
  callkeepUserId = id;
}

function getSelfId(): string {
  const q: any = (socketInstance as any)?.io?.opts?.query;
  return callkeepUserId || q?.userId || '';
}

function onCallAccepted({roomId, userId, callType}: any) {
  if (!currentCallData || currentCallData.roomId !== roomId) return;
  if (currentCallData.isAnswered) return;

  currentCallData.isAnswered = true;
  currentCallData.startTime = Date.now();
  currentCallData.callType = callType;

  closeCallKeepUI(currentCallData.uuid);
  safeNavigateToZego(currentCallData);
}

function onCallEnded({roomId}: any) {
  if (!currentCallData || currentCallData.roomId !== roomId) return;
  closeCallKeepUI(currentCallData.uuid);
  stopKeepAlive();
}

function closeCallKeepUI(uuid?: string) {
  if (uuid) RNCallKeep.endCall(uuid);
  else if (currentCallData?.uuid) RNCallKeep.endCall(currentCallData.uuid);
}

function safeNavigateToZego(d: CurrentCallData) {
  navigationRef.current?.navigate('ZegoCallScreen', {
    selfId: d.selfId,
    selfName: d.selfName,
    peerId: d.peerId,
    peerName: d.peerName,
    callID: d.roomId,
    image: d.image ?? null,
    isCaller: d.isCaller,
    callType: d.callType,
  });
}

export async function setupCallKeep() {
  if (initialized) return;
  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);
  initialized = true;

  RNCallKeep.addEventListener('answerCall', () => {
    if (!currentCallData || currentCallData.isAnswered) return;

    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();

    socketInstance?.emit('acceptCall', {
      roomId: currentCallData.roomId,
      userId: currentCallData.selfId,
      callType: currentCallData.callType,
    });

    closeCallKeepUI(currentCallData.uuid);
    safeNavigateToZego(currentCallData);
  });

  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    if (!currentCallData || currentCallData.isAnswered) return;
    socketInstance?.emit('callEnded', {
      roomId: currentCallData.roomId,
      senderId: currentCallData.selfId,
      missed: true, // chưa trả lời => missed
      duration: 0,
      callType: currentCallData.callType,
    });
    stopKeepAlive();
  });
}

export function showIncomingCall({
  uuid = uuidv4(),
  callerName,
  handle = 'number',
  hasVideo = true,
  roomId,
  callerId,
  image,
}: {
  uuid?: string;
  callerName: string;
  handle?: string;
  hasVideo?: boolean;
  roomId: string;
  callerId: string;
  image?: string;
}) {
  const selfId = getSelfId();
  if (selfId) {
    socketInstance?.emit('joinRoom', {roomId, userId: selfId});
  }

  currentCallData = {
    uuid,
    roomId,
    selfId,
    selfName: 'Me',
    peerId: callerId,
    peerName: callerName,
    image,
    callType: hasVideo ? 'video' : 'voice',
    isCaller: false,
    isAnswered: false,
  };
  RNCallKeep.displayIncomingCall(uuid, handle, callerName, 'generic', hasVideo);
  return uuid;
}

export function startOutgoingCall({
  uuid = uuidv4(),
  callee,
  hasVideo = true,
  roomId,
  selfId,
  selfName,
  calleeId,
  calleeName,
  image,
}: {
  uuid?: string;
  callee: string;
  hasVideo?: boolean;
  roomId: string;
  selfId: string;
  selfName: string;
  calleeId: string;
  calleeName: string;
  image?: string;
}) {
  startKeepAlive(
    hasVideo ? 'Đang kết nối video call…' : 'Đang kết nối voice call…',
    'Giữ kết nối ổn định trong khi chờ đối phương.',
  );

  currentCallData = {
    uuid,
    roomId,
    selfId,
    selfName,
    peerId: calleeId,
    peerName: calleeName,
    image,
    callType: hasVideo ? 'video' : 'voice',
    isCaller: true,
    isAnswered: false,
  };

  // (khuyến nghị) caller join room sớm
  socketInstance?.emit('joinRoom', {roomId, userId: selfId});

  RNCallKeep.startCall(uuid, callee, calleeName, 'number', hasVideo);
  return uuid;
}
