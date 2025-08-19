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

/** ===== Guard để không gọi API lặp cho cùng 1 cuộc gọi (key = uuid) ===== */
const callGuards = new Map<string, {acceptSent: boolean; endSent: boolean}>();
function ensureGuard(uuid?: string) {
  const key = uuid || currentCallData?.uuid;
  if (!key) return null;
  let g = callGuards.get(key);
  if (!g) {
    g = {acceptSent: false, endSent: false};
    callGuards.set(key, g);
  }
  return g;
}

/* ============== Socket binding (chỉ lắng nghe 2 sự kiện) ============== */
export function setCallKeepSocket(s: Socket | null) {
  if (socketInstance) {
    socketInstance.off('callAccepted', onCallAccepted);
    socketInstance.off('callEnded', onCallEnded);
    socketInstance.off('callDeclined', onCallDeclined);
  }
  socketInstance = s;
  if (s) {
    s.on('callAccepted', onCallAccepted);
    s.on('callEnded', onCallEnded);
    s.on('callDeclined', onCallDeclined);
  }
}

export function setCallKeepUserId(id: string) {
  callkeepUserId = id;
}

function getSelfId(): string {
  const q: any = (socketInstance as any)?.io?.opts?.query;
  return callkeepUserId || q?.userId || '';
}

function onCallDeclined(payload: {roomId: string; callUuid?: string}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;

  const g = ensureGuard(currentCallData.uuid);
  closeCallKeepUI(currentCallData.uuid);

  // Caller là người "end" chính thức 1 lần duy nhất
  if (g && !g.endSent) {
    g.endSent = true;
    api
      .post('/calls/end', {
        roomId: currentCallData.roomId,
        userId: currentCallData.selfId,
        missed: true, // tuỳ bạn muốn hiển thị "bị từ chối" hay "nhỡ"
        duration: 0,
        callType: currentCallData.callType,
        callUuid: currentCallData.uuid,
      })
      .catch(e =>
        console.warn(
          '[caller/end after decline] api error:',
          (e as any)?.message,
        ),
      );
  }
}

/** Caller nhận được callee đã bấm “Nghe” → đóng UI CallKeep, vào Zego */
function onCallAccepted(payload: {
  roomId: string;
  userId: string;
  callType?: CallType;
}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;

  if (payload.callType) {
    currentCallData.callType = payload.callType;
  }
  // Không gọi API ở đây, chỉ đóng UI & vào Zego (Zego sẽ lo phần còn lại)
  closeCallKeepUI(currentCallData.uuid);
  navigateToZego(currentCallData);
}

/** Peer kết thúc trước khi mình nghe → đóng UI (1 lần) */
function onCallEnded(payload: {roomId: string}) {
  if (!currentCallData) return;
  if (String(payload.roomId) !== String(currentCallData.roomId)) return;

  const g = ensureGuard();
  if (g?.endSent) return; // đã xử lý end cho uuid này rồi
  g!.endSent = true;

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

  // Nhấn "Nghe": gọi API accept (1 lần/uuid) → đóng UI → vào Zego
  RNCallKeep.addEventListener('answerCall', async () => {
    if (!currentCallData) return;
    const {roomId, selfId, callType, uuid} = currentCallData;
    const g = ensureGuard(uuid);
    if (!g) return;

    if (!g.acceptSent) {
      g.acceptSent = true;
      try {
        await api.post('/calls/accept', {
          roomId,
          userId: selfId,
          callType,
          callUuid: uuid,
        });
      } catch (e) {
        // Không block điều hướng
        console.warn('[accept] api error:', (e as any)?.message);
      }
    }

    closeCallKeepUI(uuid);
    navigateToZego(currentCallData);
  });

  // Không nghe/đóng UI: gọi API end (missed) 1 lần/uuid
  RNCallKeep.addEventListener('endCall', async () => {
    if (!currentCallData) return;
    const {roomId, selfId, callType, uuid, isCaller} = currentCallData;

    const g = ensureGuard(uuid);
    if (!g) return;

    // Nếu đã "Nghe" rồi thì CallKeep UI đóng do Zego -> không làm gì ở đây
    if (g.acceptSent) return;

    if (isCaller) {
      if (g.endSent) return;
      g.endSent = true;
      try {
        await api.post('/calls/end', {
          roomId,
          userId: selfId,
          missed: false,
          duration: 0,
          callType,
          callUuid: uuid,
        });
      } catch (e) {
        console.warn('[end/caller] api error:', (e as any)?.message);
      }
    } else {
      if (g.endSent) return;
      g.endSent = true;
      try {
        await api.post('/calls/decline', {
          roomId,
          userId: selfId,
          callType,
          callUuid: uuid,
        });
      } catch (e) {
        console.warn('[decline/callee] api error:', (e as any)?.message);
      }
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
    // joinRoom để nếu socket còn sống, bạn vẫn nhận realtime
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

  // reset/khởi tạo guard cho uuid mới
  callGuards.set(uuid, {acceptSent: false, endSent: false});

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

  callGuards.set(uuid, {acceptSent: false, endSent: false});

  socketInstance?.emit('joinRoom', {roomId, userId: selfId});
  RNCallKeep.startCall(uuid, callee, calleeName, 'number', hasVideo);

  return uuid;
}

/** (tuỳ nhu cầu) trạng thái hiện tại */
export function getCurrentCallData() {
  return currentCallData;
}
