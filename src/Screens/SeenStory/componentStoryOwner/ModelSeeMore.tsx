import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import React, {useState} from 'react';
import {X, Bookmark} from 'lucide-react-native';
import {Colors} from '@assets/color/Colors';
import ModalAddToHighlight from './ModalAddToHighlight';

const ModalSeeMore = ({
  visible,
  onClose,
  onDelete,
  storyId,
  storyThumbnail,
}: {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  storyId?: string;
  storyThumbnail?: string;
}) => {
  const [showAddToHighlight, setShowAddToHighlight] = useState(false);

  const handleAddToHighlight = () => {
    setShowAddToHighlight(true);
  };

  const handleCloseAddToHighlight = () => {
    setShowAddToHighlight(false);
  };

  const handleAddToHighlightSuccess = () => {
    // Close both modals when story is successfully added to highlight
    setShowAddToHighlight(false);
    onClose();
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}>
        <Pressable style={styles.modalContainer} onPress={onClose}>
          <View style={styles.modalContent}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Tin Đang hoạt động</Text>
                <TouchableOpacity onPress={onClose}>
                  <X color={'#fff'} />
                </TouchableOpacity>
              </View>
              <View style={styles.mid}>
                <TouchableOpacity
                  style={styles.addToHighlightButton}
                  onPress={handleAddToHighlight}
                  activeOpacity={0.7}>
                  <Bookmark size={20} color={'#fff'} style={styles.buttonIcon} />
                  <Text style={styles.txtAddToHighlight}>Thêm vào tin nổi bật</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={onDelete}
                  activeOpacity={0.7}>
                  <Text style={styles.txtRemoveStory}>Xoá tin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ModalAddToHighlight
        visible={showAddToHighlight}
        onClose={handleCloseAddToHighlight}
        onSuccess={handleAddToHighlightSuccess}
        storyId={storyId || ''}
        storyThumbnail={storyThumbnail}
      />
    </>
  );
};

export default ModalSeeMore;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#000',
    width: '100%',
    height: '25%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    flex: 1,
    margin: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  mid: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  addToHighlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  txtAddToHighlight: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    width: '100%',
    alignItems: 'center',
  },
  txtRemoveStory: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '500',
  },
});
