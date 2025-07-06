import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useTheme} from '../../../util/ThemeContext';
import {Colors} from '../../../../assets/color/Colors';
import {Video, Image, Plus, BookOpen} from 'lucide-react-native';

interface ModalCreateProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const {theme} = useTheme();
  const color = Colors[theme];

  const options = [
    {
      id: 'reels',
      title: 'Reels',
      icon: Video,
      color: '#FF6B6B',
    },
    {
      id: 'post',
      title: 'Bài viết',
      icon: Image,
      color: '#4ECDC4',
    },
    {
      id: 'story',
      title: 'Story',
      icon: Plus,
      color: '#45B7D1',
    },
    {
      id: 'highlight',
      title: 'Highlight',
      icon: BookOpen,
      color: '#96CEB4',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: color.background}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: color.text}]}>
              Tạo nội dung mới
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, {color: color.text}]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.optionsContainer}>
            {options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.option}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}>
                <View
                  style={[
                    styles.iconContainer,
                    {backgroundColor: option.color},
                  ]}>
                  <option.icon size={24} color="white" />
                </View>
                <Text style={[styles.optionTitle, {color: color.text}]}>
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: Dimensions.get('window').width * 0.8,
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  option: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ModalCreate;
