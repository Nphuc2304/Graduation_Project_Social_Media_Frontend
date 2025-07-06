import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

interface MoreActionModalProps {
  visible: boolean;
  onClose: () => void;
  onUnfollow: () => void;
  onReport: () => void;
}

export const MoreActionModal: React.FC<MoreActionModalProps> = ({
  visible,
  onClose,
  onUnfollow,
  onReport,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.option} onPress={() => { onUnfollow(); onClose(); }}>
            <Text style={styles.optionTextDestructive}>Bỏ theo dõi</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.option} onPress={() => { onReport(); onClose(); }}>
            <Text style={styles.optionText}>Báo cáo</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.option} onPress={onClose}>
            <Text style={styles.optionText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  option: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    color: '#007BFF',
  },
  optionTextDestructive: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginHorizontal: 20,
  },
});