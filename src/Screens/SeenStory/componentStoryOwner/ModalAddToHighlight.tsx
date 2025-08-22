import React, {useState, useEffect} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import {X, Plus} from 'lucide-react-native';
import {Colors} from '@assets/color/Colors';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {fetchHighlightStory, updateHighlightStory} from '../../../../services/StoryRedux/StorySlice';
import {useHeadAlert} from '../../../../components/Global/HeadAlertProvider';

interface ModalAddToHighlightProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  storyId: string;
  storyThumbnail?: string;
}

const ModalAddToHighlight: React.FC<ModalAddToHighlightProps> = ({
  visible,
  onClose,
  onSuccess,
  storyId,
  storyThumbnail,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {showAlert} = useHeadAlert();
  const currentUser = useSelector((state: RootState) => state.user.user);
  const {highlightStories, loading} = useSelector((state: RootState) => state.stories);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch highlight stories when modal opens
  useEffect(() => {
    if (visible && currentUser?._id) {
      dispatch(fetchHighlightStory({userId: currentUser._id}));
    }
  }, [visible, currentUser?._id, dispatch]);

  const handleAddToHighlight = async (highlightId: string, currentStoryIds: string[]) => {
    if (isProcessing) return;

    // Check if story is already in this highlight
    if (currentStoryIds.includes(storyId)) {
      showAlert('Thông báo', 'Story này đã có trong highlight này rồi!');
      return;
    }

    setIsProcessing(true);
    try {
      // Add story to highlight
      const updatedStoryIds = [...currentStoryIds, storyId];
      
      await dispatch(
        updateHighlightStory({
          highlightId,
          storyId: updatedStoryIds,
        }),
      ).unwrap();

      // Refresh highlight stories to get updated data
      if (currentUser?._id) {
        dispatch(fetchHighlightStory({userId: currentUser._id}));
      }

      showAlert('Thành công', 'Đã thêm story vào highlight!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể thêm story vào highlight. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderHighlightItem = ({item}: {item: any}) => {
    const isStoryInHighlight = item.storyId?.includes(storyId);
    
    return (
      <TouchableOpacity
        style={[
          styles.highlightItem,
          isStoryInHighlight && styles.highlightItemDisabled,
        ]}
        onPress={() => {
          if (!isStoryInHighlight) {
            handleAddToHighlight(item._id, item.storyId || []);
          }
        }}
        disabled={isStoryInHighlight || isProcessing}
        activeOpacity={0.7}>
        <View style={styles.highlightInfo}>
          <Image
            source={{
              uri: item.thumbnail || 'https://via.placeholder.com/60x60?text=H',
            }}
            style={styles.highlightThumbnail}
          />
          <View style={styles.highlightText}>
            <Text style={styles.highlightName} numberOfLines={1}>
              {item.collectionName}
            </Text>
            <Text style={styles.highlightCount}>
              {item.storyId?.length || 0} stories
            </Text>
          </View>
        </View>
        
        {isStoryInHighlight ? (
          <Text style={styles.alreadyAddedText}>Đã có</Text>
        ) : (
          <Plus size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        Bạn chưa có highlight nào.{'\n'}
        Tạo highlight mới để lưu trữ story yêu thích!
      </Text>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Thêm vào tin nổi bật</Text>
              <TouchableOpacity onPress={onClose}>
                <X color={'#fff'} />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Đang tải highlights...</Text>
              </View>
            ) : (
              <FlatList
                data={highlightStories}
                renderItem={renderHighlightItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default ModalAddToHighlight;

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
    height: '70%',
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  listContainer: {
    flexGrow: 1,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 10,
  },
  highlightItemDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  highlightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  highlightThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  highlightText: {
    flex: 1,
  },
  highlightName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  highlightCount: {
    color: '#999',
    fontSize: 14,
  },
  alreadyAddedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
