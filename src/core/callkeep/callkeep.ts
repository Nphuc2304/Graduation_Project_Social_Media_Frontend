import RNCallKeep, {IOptions} from 'react-native-callkeep';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {navigationRef} from '../../NavigationService';
import {Socket} from 'socket.io-client';
import api from '../../../services/axiosInstance';

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

/* ===================== Socket binding (1 listener duy nhất) ===================== */
export function setCallKeepSocket(s: Socket | null) {
  if (socketInstance) {
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

function onCallAccepted(payload: {
  roomId: string;
  userId: string;
  callType?: CallType;
}) {
  if (!currentCallData) return;
  if (payload?.callType) {
    (currentCallData as any).callType = payload.callType;
  }
  closeCallKeepUI(currentCallData.uuid);
  navigateToZego(currentCallData);
}

function onCallEnded(payload: {roomId: string}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;
  // peer đã kết thúc trước khi mình bấm nghe -> đóng UI
  closeCallKeepUI(currentCallData.uuid);
}

/* ===================== Helpers ===================== */
function closeCallKeepUI(uuid?: string) {
  try {
    if (uuid) RNCallKeep.endCall(uuid);
    else if (currentCallData?.uuid) RNCallKeep.endCall(currentCallData.uuid);
  } catch {}
}

function navigateToZego(d: CurrentCallData) {
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

/* ===================== CallKeep setup ===================== */
export async function setupCallKeep() {
  if (initialized) return;
  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);
  initialized = true;

  // Nhấn "Nghe": gọi API accept -> đóng UI -> vào Zego
  RNCallKeep.addEventListener('answerCall', async () => {
    if (!currentCallData) return;
    const {roomId, selfId, callType, uuid} = currentCallData;

    try {
      await api.post('/calls/accept', {
        roomId,
        userId: selfId,
        callType,
        callUuid: uuid,
      });
    } catch (e) {
      // không chặn điều hướng, BE vẫn có socket/push fallback
      console.warn('[accept] api error:', (e as any)?.message);
    }

    closeCallKeepUI(uuid);
    navigateToZego(currentCallData);
  });

  // Không nghe/đóng UI: gọi API end (missed)
  RNCallKeep.addEventListener('endCall', async () => {
    if (!currentCallData) return;
    const {roomId, selfId, callType, uuid} = currentCallData;

    try {
      await api.post('/calls/end', {
        roomId,
        userId: selfId,
        missed: true,
        duration: 0,
        callType,
        callUuid: uuid,
      });
    } catch (e) {
      console.warn('[end] api error:', (e as any)?.message);
    }
  });
}

/* ===================== Public APIs ===================== */
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
    // joinRoom để nếu socket còn sống, bạn vẫn nhận được event realtime
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
  };

  socketInstance?.emit('joinRoom', {roomId, userId: selfId});
  RNCallKeep.startCall(uuid, callee, calleeName, 'number', hasVideo);

  return uuid;
}
