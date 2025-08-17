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

let initialized = (globalThis as any).__CK_INIT__ ?? false;
let socketWired = false;
let currentCallData: CurrentCallData | null = null;
let suppressNextEndEvent = false;

let socketInstance: Socket | null = null;
let callkeepUserId: string | null = null;

export function setCallKeepSocket(s: Socket | null) {
  socketInstance = s;
  if (s) wireCallSocketHandlers();
}

export function setCallKeepUserId(id: string) {
  callkeepUserId = id;
}

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
    callType: d.callType,
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
    if (!currentCallData) return;

    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();

    // join room + báo accept
    socketInstance?.emit('joinRoom', {
      roomId: currentCallData.roomId,
      userId: currentCallData.selfId,
    });

    socketInstance?.emit('acceptCall', {
      roomId: currentCallData.roomId,
      userId: currentCallData.selfId,
      callType: currentCallData.callType,
    });

    // điều hướng vào Zego
    navigationRef.current?.navigate('ZegoCallScreen', {
      selfId: currentCallData.selfId,
      selfName: currentCallData.selfName,
      peerId: currentCallData.peerId,
      peerName: currentCallData.peerName,
      callID: currentCallData.roomId,
      image: currentCallData.image ?? null,
      isCaller: currentCallData.isCaller,
      callType: currentCallData.callType,
    });

    closeCallKeepUI(callUUID);
  });

  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
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

    // caller: đóng UI → vào Zego
    closeCallKeepUI(currentCallData.uuid);
    navigationRef.current?.navigate('ZegoCallScreen', {
      selfId: currentCallData.selfId,
      selfName: currentCallData.selfName,
      peerId: currentCallData.peerId,
      peerName: currentCallData.peerName,
      callID: roomId,
      image: currentCallData.image ?? null,
      isCaller: currentCallData.isCaller,
      callType,
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
  currentCallData = {
    uuid,
    roomId,
    selfId: getSelfId(),
    selfName: 'Me', // set từ profile context
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
  RNCallKeep.startCall(uuid, callee, calleeName, 'number', hasVideo);
  return uuid;
}

export function endCall(uuid?: string) {
  const d = currentCallData;
  const id = uuid ?? d?.uuid;
  if (!id) return;

  if (d) emitCallEnded(d, !d.isAnswered);
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

function onIncomingCallFromServer({
  callerId,
  callerName,
  type,
  roomId,
  callUuid,
  image,
}: any) {
  showIncomingCall({
    uuid: callUuid || uuidv4(),
    callerName,
    handle: callerId,
    hasVideo: type === 'video',
    roomId,
    callerId,
    image,
  });
}
