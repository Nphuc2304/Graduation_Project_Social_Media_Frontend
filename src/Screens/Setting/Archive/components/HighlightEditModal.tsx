import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Modal,
} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker';
import {Colors} from '../../../../../assets/color/Colors';
import {useTheme} from '../../../../util/ThemeContext';
import {GlobalAlertManager} from '../../../../../components/Global/AlertModal';
import { Story } from '@services/StoryRedux/StoryType';

export interface HighlightEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStories: Story[];
  onSaveHighlight: (
    storyIds: string[],
    highlightName: string,
    coverImageUrl: string
  ) => Promise<void>;
  uploadImageToR2: any;
  showUploadModal: () => void;
  hideUploadModal: () => void;
  setProgress: (value: number) => void;
  onComplete: () => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

const HighlightEditModal = ({
  isOpen,
  onClose,
  selectedStories,
  onSaveHighlight,
  uploadImageToR2,
  showUploadModal,
  hideUploadModal,
  setProgress,
  onComplete,
  isProcessing,
  setIsProcessing,
}: HighlightEditModalProps) => {
  const [highlightName, setHighlightName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [length, setLength] = useState(0);
  const {theme} = useTheme();
  const color = Colors[theme];

  // lấy ảnh đầu tiên của select item
  React.useEffect(() => {
    if (!isCustomCover && selectedStories.length > 0) {
      setCoverImage(selectedStories[0].mediaUrl);
    }
  }, [selectedStories, isCustomCover]);
  useEffect(() => {
    setLength(highlightName.length);
  }, [highlightName]);

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
        setIsCustomCover(true); // đánh dấu là đã tự chọn
        setCoverImage(response.assets[0].uri ?? null);
      }
    });
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

      const storyIds = selectedStories.map((s: Story) => s._id);
      await onSaveHighlight(storyIds, highlightName, uploadedCoverUrl);

      // reset
      setHighlightName('');
      setCoverImage(null);
      setIsCustomCover(false);
      onComplete();
    } catch (error) {
      GlobalAlertManager.show(
        'Lỗi',
        'Không thể lưu highlight. Vui lòng thử lại.',
      );
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, {backgroundColor: color.background}]}>
          <View style={styles.modalHandle} />
          <View style={{marginTop: 35}}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <ChevronLeft size={24} color={color.text} />
              </TouchableOpacity>
              <Text style={[styles.title, {color: color.text}]}>
                Chỉnh sửa Highlight
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.save}>Lưu</Text>
              </TouchableOpacity>
            </View>
            <View style={{alignItems: 'center'}}>
              {coverImage ? (
                <Image source={{uri: coverImage}} style={styles.coverImage} />
              ) : (
                <Image
                  source={{uri: 'https://via.placeholder.com/200'}}
                  style={styles.coverImage}
                />
              )}
              <TouchableOpacity onPress={pickImage}>
                <Text style={styles.editCover}>Chỉnh sửa ảnh bìa</Text>
              </TouchableOpacity>
            </View>
            <View style={[{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, styles.input]}>

            <TextInput
             style={{flex: 1, color: color.text}}
              placeholder="Nhập tên highlight"
              placeholderTextColor={'gray'}
              value={highlightName}
              onChangeText={setHighlightName}
              maxLength={10}
            />
            <Text style={{color: color.text, fontSize: 12, }}>{length}/10</Text>
            </View>
            <FlatList
              data={selectedStories}
              renderItem={({item}) => (
                <Image
                  resizeMode="cover"
                  source={{uri: item.mediaUrl}}
                  style={styles.image}
                />
              )}
              keyExtractor={item => item._id}
              numColumns={3}
              columnWrapperStyle={styles.row}
              ListEmptyComponent={
                <Text style={{textAlign: 'center'}}>
                  Không có ảnh được chọn.
                </Text>
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HighlightEditModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  modalHandle: {
    backgroundColor: '#ccc',
    height: 4,
    width: 50,
    alignSelf: 'center',
    borderRadius: 2,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  save: {
    fontSize: 16,
    color: '#3897F0',
    fontWeight: '500',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  row: {
    marginBottom: 5,
  },
  image: {
    width: '33%',
    height: 200,
    margin: 1,
    borderRadius: 5,
  },
  coverImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    borderRadius: 50,
  },
  editCover: {
    marginBottom: 20,
    color: '#3897F0',
  },
});
