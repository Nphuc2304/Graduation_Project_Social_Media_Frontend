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
    // selfManaged: true,
    alertTitle: 'Quyền gọi',
    alertDescription: 'Ứng dụng cần quyền để hiển thị cuộc gọi.',
    cancelButton: 'Huỷ',
    okButton: 'OK',
    additionalPermissions: [],
  },
};

let initialized = (globalThis as any).__CK_INIT__ ?? false;
let socketWired = false;
let currentCallData: CurrentCallData | null = null;
let suppressNextEndEvent = false;

// ==== giữ socket instance từ SocketProvider ====
let socketInstance: Socket | null = null;
let callkeepUserId: string | null = null;
export function setCallKeepSocket(s: Socket | null) {
  socketInstance = s;
  if (s) wireCallSocketHandlers();
}

export function setCallKeepUserId(id: string) {
  callkeepUserId = id;
}

// ===== helpers =====
function calcDurationSec(d: CurrentCallData) {
  return d.startTime ? Math.floor((Date.now() - d.startTime) / 1000) : 0;
}

function emitCallEnded(d: CurrentCallData, missed = false) {
  if (!d.roomId || !d.selfId) return;
  socketInstance?.emit('callEnded', {
    roomId: d.roomId,
    senderId: d.selfId,
    missed,
    duration: missed ? 0 : calcDurationSec(d),
    callType: d.callType ?? 'video',
  });
}

function closeCallKeepUI(uuid?: string) {
  suppressNextEndEvent = true;
  if (uuid) RNCallKeep.endCall(uuid);
  else if (currentCallData?.uuid) RNCallKeep.endCall(currentCallData.uuid);
}

export function isCallKeepReady() {
  return initialized === true;
}

export async function setupCallKeep() {
  if (initialized) return;

  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);

  try {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
  } catch {}

  RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
    if (!currentCallData) return;

    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();

    socketInstance?.emit('joinRoom', {
      roomId: currentCallData.roomId,
      userId: currentCallData.selfId,
    });

    socketInstance?.emit('acceptCall', {
      roomId: currentCallData.roomId,
      userId: currentCallData.selfId,
      callType: currentCallData.callType ?? 'video',
    });

    navigationRef.current?.navigate('ZegoCallScreen', {
      callUUID,
      isIncoming: !currentCallData.isCaller,
      userID: currentCallData.selfId,
      userName: currentCallData.peerName ?? '',
      callID: currentCallData.roomId,
      image: 'https://link-to-avatar',
      callType: currentCallData.callType,
      isCaller: currentCallData.isCaller,
    });

    closeCallKeepUI(callUUID);
  });

  // ====== End Call ======
  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    console.log('endCall', callUUID);
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

  socketInstance.on('callAccepted', ({roomId, userId, callType}) => {
    if (!currentCallData || currentCallData.roomId !== roomId) return;

    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();
    currentCallData.callType = callType;

    // Caller đóng UI & vào Zego
    closeCallKeepUI(currentCallData.uuid);
    navigationRef.current?.navigate('ZegoCallScreen', {
      callUUID: currentCallData.uuid,
      isIncoming: !currentCallData.isCaller, // caller = false => isIncoming=false
      userID: currentCallData.selfId,
      userName: currentCallData.peerName ?? '',
      callID: roomId,
      callType,
      isCaller: currentCallData.isCaller,
    });
  });

  socketInstance.on('callEnded', ({roomId}) => {
    if (!currentCallData || currentCallData.roomId !== roomId) return;
    closeCallKeepUI(currentCallData.uuid);
    currentCallData = null;
  });

  socketWired = true;
}

function getSelfId(): string {
  const q: any = (socketInstance as any)?.io?.opts?.query;
  return callkeepUserId || q?.userId || '';
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
    selfId: getSelfId(),
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
  callUUID,
}: any) {
  showIncomingCall({
    uuid: callUuid || callUUID || uuidv4(),
    callerName,
    handle: callerId,
    hasVideo: type === 'video',
    roomId,
    selfId: getSelfId(),
    callerId,
  });
}
