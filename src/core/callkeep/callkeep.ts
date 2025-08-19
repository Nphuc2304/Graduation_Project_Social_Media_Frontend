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

/* ===================== REST fallback qua axiosInstance ===================== */
async function restAccept(
  roomId: string,
  userId: string,
  callType: CallType,
  callUuid?: string,
) {
  try {
    await api.post('/calls/accept', {roomId, userId, callType, callUuid});
  } catch (e: any) {
    console.warn('[REST accept] fail:', e?.message || e);
  }
}

async function restEnd(
  roomId: string,
  userId: string,
  missed: boolean,
  duration: number,
  callType: CallType,
  callUuid?: string,
) {
  try {
    await api.post('/calls/end', {
      roomId,
      userId,
      missed,
      duration,
      callType,
      callUuid,
    });
  } catch (e: any) {
    console.warn('[REST end] fail:', e?.message || e);
  }
}

/* ===================== Socket binding ===================== */
export function setCallKeepSocket(s: Socket | null) {
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

function onCallAccepted(payload: {
  roomId: string;
  userId: string;
  callType: CallType;
}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;

  currentCallData.isAnswered = true;
  currentCallData.startTime = Date.now();
  currentCallData.callType = payload.callType;

  closeCallKeepUI(currentCallData.uuid);
  navigateToZego(currentCallData);
}

function onCallEnded(payload: {
  roomId: string;
  endedBy?: string;
  missed?: boolean;
  duration?: number;
}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;

  closeCallKeepUI(currentCallData.uuid);
  // Zego screen sẽ tự goBack khi nhận 'callEnded' đúng roomId
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

  // Người nhận bấm "Nghe"
  RNCallKeep.addEventListener('answerCall', async () => {
    if (!currentCallData) return;
    const {roomId, selfId, callType, uuid} = currentCallData;

    // REST fallback trước (trường hợp socket suspend)
    await restAccept(roomId, selfId, callType, uuid);

    // Bonus realtime nếu socket đang sống
    socketInstance?.emit('acceptCall', {roomId, userId: selfId, callType});

    // Đánh dấu đã trả lời để endCall không gửi missed
    currentCallData.isAnswered = true;
    currentCallData.startTime = Date.now();

    closeCallKeepUI(uuid);
    navigateToZego(currentCallData);
  });

  // UI CallKeep bị đóng (Decline/OS) -> chỉ gửi missed nếu CHƯA answer
  RNCallKeep.addEventListener('endCall', async ({callUUID}) => {
    if (!currentCallData) return;

    const {roomId, selfId, callType, isAnswered, uuid} = currentCallData;

    if (isAnswered) {
      // Đã trả lời: kết thúc sẽ do Zego screen gửi /calls/end
      return;
    }

    // Missed
    await restEnd(roomId, selfId, true, 0, callType, uuid);

    // Bonus realtime
    socketInstance?.emit('callEnded', {
      roomId,
      senderId: selfId,
      missed: true,
      duration: 0,
      callType,
    });
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

  socketInstance?.emit('joinRoom', {roomId, userId: selfId});
  RNCallKeep.startCall(uuid, callee, calleeName, 'number', hasVideo);

  return uuid;
}
