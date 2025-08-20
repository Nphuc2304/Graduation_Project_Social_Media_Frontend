import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {PhoneOff, Phone, Video} from 'lucide-react-native';

type Props = {
  visible: boolean;
  callerName?: string;
  callerAvatar?: string;
  callType?: 'video' | 'voice';
  onAccept: () => void;
  onDecline: () => void;
  onRequestClose?: () => void;
};

const CallInvitePopup = ({
  visible,
  callerName = 'Cuộc gọi đến',
  callerAvatar,
  callType = 'video',
  onAccept,
  onDecline,
  onRequestClose,
}: Props) => {
  const Icon = callType === 'video' ? Video : Phone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              {callerAvatar ? (
                <Image source={{uri: callerAvatar}} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>
                    {callerName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {callerName}
            </Text>
            <View style={styles.sub}>
              <Icon size={16} color="#cbd5e1" />
              <Text style={styles.subText}>đang gọi cho bạn…</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline]}
              activeOpacity={0.9}
              onPress={onDecline}>
              <PhoneOff size={22} color="#fff" />
              <Text style={styles.btnText}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnAccept]}
              activeOpacity={0.9}
              onPress={onAccept}>
              <Icon size={22} color="#fff" />
              <Text style={styles.btnText}>Chấp nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CallInvitePopup;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)', // slate-950/55
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#0b1220',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  header: {alignItems: 'center', marginBottom: 18},
  avatarWrap: {marginBottom: 10},
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#334155',
  },
  avatarFallback: {
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#e5e7eb', fontSize: 28, fontWeight: '700'},
  name: {color: '#e5e7eb', fontSize: 20, fontWeight: '700'},
  sub: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subText: {color: '#cbd5e1', fontSize: 13, fontWeight: '500'},
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: '#ef4444',
    ...Platform.select({
      android: {elevation: 3},
      ios: {
        shadowColor: '#ef4444',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 6},
      },
    }),
  },
  btnAccept: {
    backgroundColor: '#10b981',
    ...Platform.select({
      android: {elevation: 3},
      ios: {
        shadowColor: '#10b981',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 6},
      },
    }),
  },
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
