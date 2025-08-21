import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ImageBackground,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {PhoneOff, Video, Phone} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSocket} from '@services/SocketContext';
import {useSelector} from 'react-redux';
import {RootState} from '@services/store';

type CallRingingProps = {
  username: string;
  avatar?: string;
  callType?: 'video' | 'voice';
  roomId: string;
  callUuid?: string;
  subtitle?: string;
  backgroundImage?: string;
  navigation?: any;

  /** Đóng UI (caller hủy hoặc bị bên kia kết thúc) */
  onClose?: () => void;
  /** Khi BE báo đã chấp nhận cuộc gọi -> bạn navigate sang Zego tại đây */
  onAccepted?: (p: {roomId: string; callType: 'video' | 'voice'}) => void;
  /** Thời gian auto-cancel nếu không ai bắt (ms). Mặc định 40s */
  ringTimeoutMs?: number;
};

const CallRinging: React.FC<CallRingingProps> = ({
  username,
  avatar,
  callType = 'video',
  roomId,
  callUuid,
  onClose,
  onAccepted,
  subtitle = 'Đang gọi…',
  backgroundImage,
  ringTimeoutMs = 40_000,
}) => {
  const insets = useSafeAreaInsets();
  const {socket} = useSocket();
  const user = useSelector((s: RootState) => s.user.user);
  const [isEnd, setIsEnd] = useState(false);

  // ===== Animation ripple =====
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const opacity2 = useSharedValue(0.6);

  useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.4, {duration: 1400, easing: Easing.out(Easing.quad)}),
      -1,
      false,
    );
    opacity1.value = withRepeat(
      withTiming(0, {duration: 1400, easing: Easing.linear}),
      -1,
      false,
    );
    scale2.value = withDelay(
      400,
      withRepeat(
        withTiming(1.4, {duration: 1400, easing: Easing.out(Easing.quad)}),
        -1,
        false,
      ),
    );
    opacity2.value = withDelay(
      400,
      withRepeat(
        withTiming(0, {duration: 1400, easing: Easing.linear}),
        -1,
        false,
      ),
    );
  }, []);

  const pulse1 = useAnimatedStyle(() => ({
    transform: [{scale: scale1.value}],
    opacity: opacity1.value,
  }));
  const pulse2 = useAnimatedStyle(() => ({
    transform: [{scale: scale2.value}],
    opacity: opacity2.value,
  }));

  const CallTypeIcon = callType === 'video' ? Video : Phone;

  // ===== Handle end call (caller tự hủy) =====
  const handleEnd = () => {
    setIsEnd(true);
    if (roomId && user?._id) {
      socket?.emit('callEnded', {
        roomId,
        senderId: user._id,
        missed: true, // caller hủy trước khi callee nghe
        duration: 0,
      });
    }
    onClose?.(); // đóng UI
  };

  // ===== Listen sự kiện từ BE: callAccepted / callEnded + auto-timeout =====
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closedRef = useRef(false); // tránh gọi onClose nhiều lần

  useEffect(() => {
    if (!socket) return;

    const onCallAccepted = (payload: {
      roomId: string;
      userId: string;
      callType: 'video' | 'voice';
    }) => {
      if (!payload?.roomId || payload.roomId !== roomId) return;
      // vào call
      onAccepted?.({roomId: payload.roomId, callType: payload.callType});
    };

    const onCallEnded = (payload: {roomId: string; missed?: boolean}) => {
      if (payload?.roomId !== roomId) return;
      if (closedRef.current) return;
      if (isEnd) return;
      closedRef.current = true;
      onClose?.();
    };

    socket.on('callAccepted', onCallAccepted);
    socket.on('callEnded', onCallEnded);

    // auto-cancel nếu không ai bắt máy
    if (ringTimeoutMs > 0) {
      timeoutRef.current = setTimeout(() => {
        if (closedRef.current) return;
        closedRef.current = true;
        // gửi callEnded (missed) rồi đóng UI
        if (roomId && user?._id) {
          socket?.emit('callEnded', {
            roomId,
            senderId: user._id,
            missed: true,
            duration: 0,
          });
        }
        onClose?.();
      }, ringTimeoutMs);
    }

    return () => {
      socket.off('callAccepted', onCallAccepted);
      socket.off('callEnded', onCallEnded);
      setIsEnd(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [socket, roomId, ringTimeoutMs, onAccepted, onClose, user?._id]);

  const Content = (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#111827', '#0b1220']}
        start={{x: 0.2, y: 0}}
        end={{x: 0.8, y: 1}}
        style={[
          styles.gradient,
          {paddingTop: insets.top, paddingBottom: insets.bottom},
        ]}>
        <View style={{height: 16}} />

        <View style={styles.centerWrap}>
          <View style={styles.avatarWrap}>
            <Animated.View style={[styles.pulse, pulse1]} />
            <Animated.View style={[styles.pulse, pulse2]} />
            <Image source={{uri: avatar}} style={styles.avatar} />
          </View>

          <Text style={styles.username} numberOfLines={1}>
            {username || 'Không xác định'}
          </Text>

          <View style={styles.subtitleWrap}>
            <CallTypeIcon size={18} color="#cbd5e1" />
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleEnd}
            style={styles.hangupButton}>
            <PhoneOff size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={{uri: backgroundImage}}
        style={styles.flex}
        blurRadius={Platform.OS === 'ios' ? 20 : 12}>
        {Content}
      </ImageBackground>
    );
  }

  return <View style={styles.flex}>{Content}</View>;
};

export default CallRinging;

const AVATAR_SIZE = 112;

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#0b1220'},
  gradient: {flex: 1, paddingHorizontal: 24, justifyContent: 'space-between'},
  centerWrap: {
    alignItems: 'center',
    marginTop: 48,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#38bdf8',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: '#94a3b8',
  },
  username: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
    maxWidth: '90%',
    textAlign: 'center',
  },
  subtitleWrap: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitleText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  hangupButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
});
