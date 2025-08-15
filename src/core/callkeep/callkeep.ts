import RNCallKeep, {IOptions} from 'react-native-callkeep';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {navigationRef} from '../../../src/NavigationService';
import {Socket} from 'socket.io-client';

type CallType = 'video' | 'voice';

type CurrentCallData = {
  uuid: string;
  roomId: string;
  selfId: string;
  peerId?: string;
  peerName?: string;
  callType?: CallType;
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

let initialized = false;
let socketWired = false;
let currentCallData: CurrentCallData | null = null;
let suppressNextEndEvent = false;

// ==== giữ socket instance từ SocketProvider ====
let socketInstance: Socket | null = null;
export function setCallKeepSocket(s: Socket | null) {
  socketInstance = s;
}

// ===== helpers =====
function calcDurationSec(d: CurrentCallData) {
  return d.startTime ? Math.floor((Date.now() - d.startTime) / 1000) : 0;
}

function emitCallEnded(d: CurrentCallData, missed = false) {
  console.log(
    'emitCallEnded',
    d,
    missed,
    !!socketInstance,
    socketInstance?.connected,
  );
  socketInstance?.emit('callEnded', {
    roomId: d.roomId,
    senderId: d.selfId,
    missed,
    duration: missed ? 0 : calcDurationSec(d),
  });
}

function closeCallKeepUI(uuid?: string) {
  suppressNextEndEvent = true;
  if (uuid) RNCallKeep.endCall(uuid);
  else if (currentCallData?.uuid) RNCallKeep.endCall(currentCallData.uuid);
}

export async function setupCallKeep() {
  if (initialized) return;

  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);

  RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
    if (currentCallData) {
      currentCallData.isAnswered = true;
      currentCallData.startTime = Date.now();

      socketInstance?.emit('joinCall', {
        roomId: currentCallData.roomId,
        userId: currentCallData.selfId,
        callType: currentCallData.callType ?? 'video',
      });

      // Chuyển sang màn hình gọi
      navigationRef.current?.navigate('ZegoCallScreen', {
        callUUID,
        isIncoming: !currentCallData.isCaller,
        userID: currentCallData.peerId ?? '',
        userName: currentCallData.peerName ?? '',
        callID: currentCallData.roomId,
        image: 'https://link-to-avatar', // có thể thay avatar thật
        callType: currentCallData.callType,
        isCaller: currentCallData.isCaller,
      });

      // Đóng UI CallKeep
      closeCallKeepUI(callUUID);
    }
  });

  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    console.log('endCall', callUUID);
    // Không phải cuộc gọi hiện tại thì bỏ qua
    if (currentCallData?.uuid && callUUID !== currentCallData.uuid) return;

    if (suppressNextEndEvent) {
      suppressNextEndEvent = false;
      currentCallData = null;
      return;
    }

    if (currentCallData) {
      emitCallEnded(currentCallData, !currentCallData.isAnswered);
    }

    currentCallData = null;
  });

  initialized = true;
}

export function wireCallSocketHandlers() {
  if (socketWired || !socketInstance) return;

  socketInstance.on('incomingCall', onIncomingCallFromServer);
  socketInstance.on('userJoinedCall', onUserJoinedCall);
  socketInstance.on('userLeftCall', onUserLeftCall);
  socketWired = true;
}

export function showIncomingCall({
  uuid = uuidv4(),
  callerName = 'Người gọi',
  handle = 'number',
  hasVideo = true,
  roomId,
  selfId,
  callerId,
}: {
  uuid?: string;
  callerName?: string;
  handle?: string;
  hasVideo?: boolean;
  roomId: string;
  selfId: string;
  callerId: string;
}) {
  currentCallData = {
    uuid,
    roomId,
    selfId,
    peerId: callerId,
    peerName: callerName,
    callType: hasVideo ? 'video' : 'voice',
    isCaller: false,
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
  selfId,
  calleeId,
  calleeName,
}: {
  uuid?: string;
  callee?: string;
  hasVideo?: boolean;
  roomId: string;
  selfId: string;
  calleeId: string;
  calleeName?: string;
}) {
  currentCallData = {
    uuid,
    roomId,
    selfId,
    peerId: calleeId,
    peerName: calleeName,
    callType: hasVideo ? 'video' : 'voice',
    isCaller: true,
    isAnswered: false,
  };
  RNCallKeep.startCall(uuid, callee, callee, 'number', hasVideo);
  return uuid;
}

export function endCall(uuid?: string) {
  const d = currentCallData;
  const id = uuid ?? d?.uuid;
  if (!id) return;

  if (d) {
    emitCallEnded(d, !d.isAnswered);
  }
  suppressNextEndEvent = true;
  RNCallKeep.endCall(id);
  currentCallData = null;
}

export function endAllCalls() {
  RNCallKeep.endAllCalls();
}

export function teardownCallKeep() {
  if (socketInstance && socketWired) {
    socketInstance.off('incomingCall', onIncomingCallFromServer);
    socketInstance.off('userJoinedCall', onUserJoinedCall);
    socketInstance.off('userLeftCall', onUserLeftCall);
    socketWired = false;
  }
}

// ===== socket handlers =====
function onIncomingCallFromServer({
  callerId,
  callerName,
  type,
  roomId,
  callUuid,
}: {
  callerId: string;
  callerName: string;
  type: CallType;
  roomId: string;
  callUuid?: string;
}) {
  const selfId = currentCallData?.selfId ?? 'me';

  // Join socket room chat và room call ngay khi nhận
  if (socketInstance) {
    socketInstance.emit('joinRoom', {roomId, userId: selfId});
    socketInstance.emit('joinCall', {roomId, userId: selfId, callType: type});
  }

  showIncomingCall({
    uuid: callUuid || uuidv4(),
    callerName,
    handle: callerId,
    hasVideo: type === 'video',
    roomId,
    selfId,
    callerId,
  });
}

function onUserJoinedCall({
  roomId,
  userId,
  callType,
}: {
  roomId: string;
  userId: string;
  callType: CallType;
}) {
  if (currentCallData?.isCaller && currentCallData.roomId === roomId) {
    closeCallKeepUI(currentCallData.uuid);
    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();
    currentCallData.callType = callType;

    navigationRef.current?.navigate('ZegoCallScreen', {
      callUUID: currentCallData.uuid,
      isIncoming: false,
      userID: userId,
      userName: currentCallData.peerName ?? 'remote-user-name',
      callID: roomId,
      image: 'https://link-to-avatar',
      isCaller: true,
    });
  }
}

function onUserLeftCall({roomId}: {roomId: string}) {
  if (currentCallData?.roomId === roomId) {
    closeCallKeepUI(currentCallData.uuid);
    currentCallData = null;
  }
}
