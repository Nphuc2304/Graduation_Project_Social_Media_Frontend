import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import {ChevronLeft, Check, X, Plus, Trash2} from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker';
import {Colors} from '../../../../assets/color/Colors';
import {useTheme} from '../../../util/ThemeContext';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {
  updateHighlightStory,
  fetchGetPostedSotry,
} from '@services/StoryRedux/StorySlice';
import {useNavigation, useRoute} from '@react-navigation/native';
import {uploadImageToR2} from '../../../core/upload';
import {useUploadProgress} from '../../../../services/UploadProgressManager';

const {width} = Dimensions.get('window');
const ITEM_SIZE = (width - 32) / 3; // Tăng padding để có khoảng cách

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

const HighlightEditScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const {theme} = useTheme();
  const color = Colors[theme];

  const {myStories, loading: storiesLoading} = useSelector(
    (state: RootState) => state.stories,
  );
  const currentUser = useSelector((state: RootState) => state.user.user);
  const [highlightName, setHighlightName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCustomCover, setIsCustomCover] = useState(false);

  const {showUploadModal, hideUploadModal, setProgress} = useUploadProgress();

  const highlight = route.params?.highlight;

  // Fetch myStories khi component mount
  useEffect(() => {
    dispatch(fetchGetPostedSotry());
  }, [dispatch]);

  useEffect(() => {
    if (highlight) {
      setHighlightName(highlight.collectionName || '');
      setCoverImage(highlight.thumbnail || null);
      setSelectedStories(highlight.storyId || []);
      setIsCustomCover(!!highlight.thumbnail);
    }
  }, [highlight]);

  const pickImage = () => {
    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    ImagePicker.launchImageLibrary(options, response => {
      if (response.didCancel) {
      } else if (response.errorCode || response.errorMessage) {
        GlobalAlertManager.show(
          'Lỗi',
          'Không thể truy cập thư viện ảnh. Vui lòng thử lại.',
        );
      } else if (response.assets && response.assets.length > 0) {
        setIsCustomCover(true);
        setCoverImage(response.assets[0].uri ?? null);
      }
    });
  };

  const toggleStorySelection = (storyId: string) => {
    setSelectedStories(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId],
    );
  };

  const handleSave = async () => {
    if (isProcessing) return;

    if (!highlightName.trim()) {
      GlobalAlertManager.show('Thông báo', 'Vui lòng nhập tên highlight.');
      return;
    }

    if (selectedStories.length === 0) {
      GlobalAlertManager.show('Thông báo', 'Vui lòng chọn ít nhất một story.');
      return;
    }

    if (!highlight?._id) {
      GlobalAlertManager.show('Lỗi', 'Không tìm thấy highlight để cập nhật.');
      return;
    }

    setIsProcessing(true);

    try {
      let uploadedCoverUrl = coverImage ?? '';

      if (uploadedCoverUrl.startsWith('file://')) {
        uploadedCoverUrl = await uploadImageToR2(uploadedCoverUrl, {
          showUploadModal,
          hideUploadModal,
          setProgress,
        });
      } else if (!isCustomCover && uploadedCoverUrl.startsWith('http')) {
        // Không làm gì
      }

      await dispatch(
        updateHighlightStory({
          highlightId: highlight._id,
          collectionName: highlightName,
          thumbnail: uploadedCoverUrl,
          storyId: selectedStories,
        }),
      ).unwrap();

      GlobalAlertManager.show('Thành công', 'Highlight đã được cập nhật!');
      navigation.goBack();
    } catch (error) {
      GlobalAlertManager.show(
        'Lỗi',
        'Không thể cập nhật highlight. Vui lòng thử lại.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStoryItem = ({item}: {item: any}) => {
    const isSelected = selectedStories.includes(item._id);

    return (
      <TouchableOpacity
        style={styles.storyItem}
        onPress={() => toggleStorySelection(item._id)}>
        <View style={styles.storyImageContainer}>
          <Image source={{uri: item.mediaUrl}} style={styles.storyImage} />
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: color.background}]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={color.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: color.text}]}>
          Chỉnh sửa Highlight
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isProcessing}>
          <Text style={[styles.saveButton, {color: color.blue}]}>
            {isProcessing ? 'Đang lưu...' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
        {/* Cover Image Section */}
        <View style={styles.coverSection}>
          <Text style={[styles.sectionTitle, {color: color.text}]}>
            Ảnh bìa
          </Text>
          <View style={styles.coverContainer}>
            {coverImage ? (
              <Image source={{uri: coverImage}} style={styles.coverImage} />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  {backgroundColor: color.gray},
                ]}>
                <Text style={{color: color.textSecondary}}>Chưa có ảnh</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editCoverButton}
              onPress={pickImage}>
              <Text style={[styles.editCoverText, {color: color.blue}]}>
                Chỉnh sửa ảnh bìa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.nameSection}>
          <Text style={[styles.sectionTitle, {color: color.text}]}>
            Tên highlight
          </Text>
          <View style={[styles.nameInput,{borderColor: color.border}]}>
          <TextInput
            style={[      
              {color: color.text, flex: 1},
            ]}
            placeholder="Nhập tên highlight"
            placeholderTextColor={color.textSecondary}
            value={highlightName}
            onChangeText={setHighlightName}
            maxLength={10}
          />
          <Text style={ {color: color.textSecondary}}>
            {highlightName.length}/10
          </Text>
          </View>
        </View>

        {/* Stories Section */}
        <View style={styles.storiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: color.text}]}>
              Chọn Stories ({selectedStories.length})
            </Text>
            {selectedStories.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSelectedStories([])}>
                <Text style={[styles.clearButtonText, {color: '#FF4444'}]}>
                  Xóa tất cả
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {storiesLoading ? (
            <View style={[styles.emptyState, {backgroundColor: color.gray}]}>
              <Text
                style={[styles.emptyStateText, {color: color.textSecondary}]}>
                Đang tải stories...
              </Text>
            </View>
          ) : myStories.length === 0 ? (
            <View style={[styles.emptyState, {backgroundColor: color.gray}]}>
              <Text
                style={[styles.emptyStateText, {color: color.textSecondary}]}>
                Bạn chưa có story nào
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...myStories].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )}
              renderItem={renderStoryItem}
              keyExtractor={item => item._id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.storiesList}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.storyRow}
            />
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  coverSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  coverContainer: {
    alignItems: 'center',
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  coverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  editCoverButton: {
    paddingVertical: 8,
  },
  editCoverText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
 
    fontSize: 16,
  },
  storiesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  storiesList: {
    paddingBottom: 20,
  },
  storyRow: {
    justifyContent: 'space-between',
  },
  storyItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 2,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 4,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  monthText: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 12,
    fontWeight: 'bold',
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    width: '100%',
    height: ITEM_SIZE * 2 + 10, // Adjust height for 2 rows of items
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default HighlightEditScreen;
