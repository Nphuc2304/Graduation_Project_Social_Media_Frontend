import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import React, {useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Colors} from '../../../../../assets/color/Colors';
import {useTheme} from '../../../../util/ThemeContext';
import {ChevronLeft, Check} from 'lucide-react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {createHighlightStory} from '@services/StoryRedux/StorySlice';
import {uploadImageToR2} from '../../../../core/upload';
import {GlobalAlertManager} from '../../../../../components/Global/AlertModal';
import HighlightEditModal from './HighlightEditModal';

const formatMonthText = (dateString?: string): string => {
  if (!dateString) return '--\n--';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--\n--';

  const months = [
    'TH1',
    'TH2',
    'TH3',
    'TH4',
    'TH5',
    'TH6',
    'TH7',
    'TH8',
    'TH9',
    'TH10',
    'TH11',
    'TH12',
  ];
  return `${date.getDate()}\n${months[date.getMonth()]}`;
};

const {width} = Dimensions.get('window');
const ITEM_SIZE = (width - 4) / 3;

export const HighlightCreateScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation: any = useNavigation();
  const route = useRoute();
  const {theme} = useTheme();
  const color = Colors[theme];
  const {myStories, loading} = useSelector((state: RootState) => state.stories);
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleStorySelection = (storyId: string) => {
    setSelectedStories(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId],
    );
  };

  const handleCreateHighlight = async (
    storyIds: string[],
    name: string,
    coverImage?: string,
  ) => {
    if (!name || typeof name !== 'string') {
      GlobalAlertManager.show('Lỗi', 'Tên highlight không hợp lệ');
      return;
    }

    try {
      await dispatch(
        createHighlightStory({
          storyId: storyIds,
          collectionName: name,
          thumbnail: coverImage || '',
        }),
      ).unwrap();

      GlobalAlertManager.show('Thành công', 'Highlight đã được tạo!');
    } catch (error) {
      console.error('❌ createHighlightStory error:', error);
      GlobalAlertManager.show('Lỗi', 'Tạo highlight thất bại.');
    }
  };

  const handleCreateHighlightButtonPress = () => {
    if (selectedStories.length === 0) {
      GlobalAlertManager.show('Lỗi', 'Vui lòng chọn ít nhất một story.');
      return;
    }
    setEditModalVisible(true);
  };

  const showUploadModal = () => {
    setUploading(true);
  };

  const hideUploadModal = () => {
    setUploading(false);
    setUploadProgress(0);
  };

  const setProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const handleClose = () => {
    setSelectedStories([]);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: color.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <ChevronLeft size={24} color={color.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: color.text}]}>
          Tin nổi bật
        </Text>
        <TouchableOpacity onPress={handleCreateHighlightButtonPress}>
          <Text style={styles.continue}>Tiếp</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={color.text} />
        </View>
      ) : myStories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, {color: color.text}]}>
            Không có story để hiển thị.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...myStories].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )}
          initialNumToRender={5}
          renderItem={({item}) => {
            const isSelected = selectedStories.includes(item._id);
            return (
              <TouchableOpacity
                style={styles.storyItem}
                onPress={() => toggleStorySelection(item._id)}>
                <Image
                  source={{uri: item.mediaUrl}}
                  style={styles.storyImage}
                />
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? '#3897F0' : color.text,
                      backgroundColor: isSelected ? '#3897F0' : 'transparent',
                    },
                  ]}>
                  {isSelected && <Check size={14} color={'#fff'} />}
                </View>
                <Text
                  style={[
                    styles.monthText,
                    {
                      backgroundColor: color.background,
                      color: color.text,
                    },
                  ]}>
                  {formatMonthText(item.createdAt)}
                </Text>
              </TouchableOpacity>
            );
          }}
          keyExtractor={item => item._id}
          numColumns={3}
          contentContainerStyle={{paddingBottom: 16}}
          showsVerticalScrollIndicator={false}
        />
      )}
      <HighlightEditModal
        isOpen={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        selectedStories={myStories.filter(item =>
          selectedStories.includes(item._id),
        )}
        onSaveHighlight={handleCreateHighlight}
        uploadImageToR2={uploadImageToR2}
        showUploadModal={showUploadModal}
        hideUploadModal={hideUploadModal}
        setProgress={setProgress}
        onComplete={() => {
          setEditModalVisible(false);
          setSelectedStories([]);
          navigation.goBack();
          navigation.navigate('Account', {shouldRefreshHighlights: true});
        }}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Đang xử lý...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  continue: {
    fontSize: 16,
    color: '#3897F0',
    fontWeight: '500',
  },
  storyItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 2,
    margin: 1,
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 14,
    fontWeight: 'bold',
    padding: 8,
    borderRadius: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});
