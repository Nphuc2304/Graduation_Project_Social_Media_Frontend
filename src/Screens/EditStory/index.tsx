import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Video, {OnLoadData, OnProgressData, VideoRef} from 'react-native-video';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Sound from 'react-native-sound';
import {useUploadProgress} from '../../../services/UploadProgressManager';
import {useSelector, useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../../../services/store';
import {createStory} from '../../../services/StoryRedux/StorySlice';
import {forceRefreshStories} from '../../../services/StoryRedux/StoryReducer';
import {uploadImageToR2, uploadVideoToR2} from '../../core/upload';
import {Dimensions} from 'react-native';
import {X, ChevronRight, Play, Music} from 'lucide-react-native';
import {userFollow} from '@services/StoryRedux/StoryType';
import LoadingModal from '../../../components/Global/LoadingModal';
import {Colors} from '@assets/color/Colors';
import BottomSheet, {
  BottomSheetRef,
} from '../PostStory/BottomSheet/BottomSheetMusic';
import {useHeadAlert} from '../../../components/Global/HeadAlertProvider';
import {DraggableCaption} from '../../../components/DraggableCaption';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export const EditStory = ({route, navigation}: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const {followingUsers} = useSelector((state: RootState) => state.stories);
  const {selectedItem} = route.params;
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<userFollow[]>(
    [],
  );
  const [caption, setCaption] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<VideoRef>(null);
  const audioRef = useRef<Sound | null>(null); // ref cho âm thanh
  const sheetRef = useRef<BottomSheetRef>(null);

  // ✅ Lưu trữ vị trí thực tế để tính toán chính xác
  const [captionPosition, setCaptionPosition] = useState({x: 10, y: 20});
  const [initialized, setInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{
    musicId: string;
    timeStart: number;
    timeEnd: number;
    song: string;
    songImage: string;
  } | null>(null);
  const [songUrl, setSongUrl] = useState<string | null>(null);

  // Sau khi render lần đầu, ngừng truyền x/y để tránh nhảy
  useEffect(() => {
    setInitialized(true);
  }, []);

  const {refreshToken, user} = useSelector((state: RootState) => state.user);

  const {showUploadModal, hideUploadModal, setProgress} = useUploadProgress();
  const {showAlert} = useHeadAlert();

  const imageDuration = 15000; // 15 seconds for images

  const getItemDuration = () => {
    if (selectedItem?.type.includes('video') && videoDuration) {
      return videoDuration * 1000; // Convert to milliseconds
    }
    return imageDuration;
  };

  const startProgressAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    progressAnim.setValue(0);
    const duration = getItemDuration();
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    });

    animationRef.current.start(({finished}) => {
      if (finished) {
        progressAnim.setValue(0); // Reset progress for loop
        startProgressAnimation(); // Restart animation
        if (selectedMusic && audioRef.current) {
          audioRef.current.setCurrentTime(selectedMusic.timeStart || 0);
          audioRef.current.play();
        }
      }
    });
  };

  const onVideoLoad = (data: OnLoadData) => {
    setVideoDuration(data.duration);
  };

  const onVideoProgress = (data: OnProgressData) => {
    if (selectedItem?.type.includes('video')) {
      const currentTime = data.currentTime;
      setVideoCurrentTime(currentTime);
      if (videoDuration) {
        const progress = currentTime / videoDuration;
        progressAnim.setValue(progress);
      }
    }
  };

  const onVideoEnd = () => {
    progressAnim.setValue(0); // Reset progress for loop
    if (videoRef.current) {
      videoRef.current.seek(0); // Restart video
    }
    if (selectedMusic && audioRef.current) {
      audioRef.current.setCurrentTime(selectedMusic.timeStart || 0);
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (selectedMusic && songUrl) {
      // Dừng nhạc cũ trước khi tạo nhạc mới
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current.release();
        audioRef.current = null;
      }

      const sound = new Sound(songUrl, undefined, error => {
        if (error) {
          return;
        }
        audioRef.current = sound;
        sound.setCurrentTime(selectedMusic.timeStart || 0);
        sound.setVolume(1.0);
        sound.play(success => {
          if (success) {
            sound.setCurrentTime(selectedMusic.timeStart || 0);
            sound.play();
          }
        });
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.release();
      }
    };
  }, [selectedMusic, songUrl]);

  useEffect(() => {
    setVideoDuration(null);
    setVideoCurrentTime(0);
    progressAnim.setValue(0);

    if (selectedItem?.type.includes('video')) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    } else {
      startProgressAnimation();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [selectedItem]);

  // Cleanup effect để dừng nhạc khi component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current.release();
        audioRef.current = null;
      }
    };
  }, []);

  const handleScreenTap = () => {
    setIsModalVisible(true);
  };

  const handleDonePress = () => {
    setIsModalVisible(false);
    setHasShownModal(true);
  };

  const onChangeCaption = (text: string) => {
    setCaption(text);

    const match = text.match(/@([a-zA-Z0-9._]*)$/);
    if (match) {
      const keyword = match[1].toLowerCase();
      const filtered = followingUsers.filter(user =>
        user.handleName.toLowerCase().includes(keyword),
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  };

  const handleSuggestionPress = (user: userFollow) => {
    const updated = caption.replace(
      /@([a-zA-Z0-9._]*)$/,
      `@${user.handleName} `,
    );
    setCaption(updated);
    setFilteredSuggestions([]);
  };

  const handleCloserPress = () => {
    // Dừng nhạc khi rời khỏi màn hình
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current.release();
      audioRef.current = null;
    }
    navigation.goBack();
  };

  // ✅ Callback để cập nhật vị trí caption
  const handleCaptionPositionChange = (x: number, y: number) => {
    setCaptionPosition({x, y});
  };

  const renderProgressBar = () => {
    const width = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width,
                backgroundColor: '#fff',
              },
            ]}
          />
        </View>
      </View>
    );
  };

  // Function để parse @mentions từ text
  const parseMentionsFromText = (text: string) => {
    const mentionRegex = /@([a-zA-Z0-9._]+)/g;
    const mentions: Array<{handleName: string; user: userFollow}> = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const handleName = match[1];

      const user = followingUsers.find(
        u => u.handleName.toLowerCase() === handleName.toLowerCase(),
      );

      if (user) {
        mentions.push({handleName, user});
      }
    }

    // Remove @mentions từ text để chỉ giữ content thuần
    const cleanText = text.replace(mentionRegex, '').trim();

    return {cleanText, mentions};
  };

  const handleUploadStory = async () => {
    try {
      setIsUploading(true);
      setProgress(0);
      if (!selectedItem) {
        setIsUploading(false);
        return;
      }

      let mediaUrl = '';
      try {
        if (selectedItem?.type.includes('video')) {
          const videoUrl = await uploadVideoToR2(selectedItem.uri, {
            showUploadModal,
            hideUploadModal,
            setProgress,
          });
          mediaUrl = videoUrl;
        } else {
          mediaUrl = await uploadImageToR2(selectedItem.uri, {
            showUploadModal,
            hideUploadModal,
            setProgress,
          });
        }
      } catch (error) {
        setIsUploading(false);
        showAlert(
          'Upload thất bại',
          `Không thể upload ${
            selectedItem?.type.includes('video') ? 'video' : 'ảnh'
          }: ${selectedItem.uri}`,
        );
        return;
      }

      const isValidMedia =
        typeof mediaUrl === 'string' && mediaUrl.trim() !== '';
      const isValidMusic =
        selectedMusic?.musicId && typeof selectedMusic.musicId === 'string';
      const isValidContent =
        caption !== undefined && caption !== null && caption.trim() !== '';

      // Parse mentions từ caption
      const {cleanText, mentions} = parseMentionsFromText(caption);

      const payload: any = {};
      if (!isValidMedia) {
        throw new Error('mediaUrl là bắt buộc và không được để trống!');
      }
      payload.mediaUrl = mediaUrl;

      if (isValidMusic) {
        payload.music = {
          _id: selectedMusic.musicId,
          time_start: Number(selectedMusic.timeStart) || 0,
          time_end: Number(selectedMusic.timeEnd) || 30,
        };
      }

      // ✅ Sử dụng vị trí caption đã được cập nhật từ gesture
      if (isValidContent && cleanText.length > 0) {
        payload.content = {
          text: cleanText,
          x: Number(captionPosition.x) || 10,
          y: Number(captionPosition.y) || 20,
        };
      }

      // Thêm tags nếu có mentions
      if (mentions.length > 0) {
        payload.tags = mentions.map(mention => ({
          user: mention.user._id, // Chỉ gửi ID string thay vì object
          position: {
            x: 0.5, // Default position, có thể customize sau
            y: 0.3,
          },
        }));
      }

      // ✅ Sử dụng Redux action thay vì direct API call
      const storyResult = await dispatch(createStory(payload)).unwrap();

      if (storyResult) {
        showAlert('Thông báo', 'Đăng story thành công.', 2000);
        dispatch(forceRefreshStories());
      }

      hideUploadModal();
      setIsUploading(false);

      // ✅ Navigate về Home và trigger immediate refresh
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'BottomTabs',
            params: {
              screen: 'Home',
              params: {
                shouldRefresh: true,
                timestamp: Date.now(), // Force refresh với timestamp mới
              },
            },
          },
        ],
      });
    } catch (error: any) {
      setIsUploading(false);
      showAlert(
        'Lỗi!!!',
        error?.response?.data?.message || 'Đăng story thất bại.',
        2000,
      );
      hideUploadModal();
    }
  };
  const [isPause, setIsPause] = useState<boolean>(true);

  // ✅ Render caption với DraggableCaption component
  const renderCaption = () => {
    if (!caption) return null;

    return (
      <DraggableCaption
        text={caption}
        initialX={captionPosition.x}
        initialY={captionPosition.y}
        onPositionChange={handleCaptionPositionChange}
        draggable={true}
      />
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.btnCloser}
              onPress={handleCloserPress}>
              <X size={24} color={'#fff'} />
            </TouchableOpacity>
            <View style={styles.viewHeaderRight}>
              <TouchableOpacity
                style={[styles.btnCloser, {marginRight: 15}]}
                onPress={() => {
                  // Dừng nhạc hiện tại nếu có
                  if (audioRef.current) {
                    audioRef.current.stop();
                    audioRef.current.release();
                    audioRef.current = null;
                  }
                  // Reset selected music
                  setSelectedMusic(null);
                  setSongUrl(null);
                  // Mở bottom sheet chọn nhạc
                  sheetRef.current?.open();
                }}>
                <Music size={24} color={'#fff'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnCloser, {marginRight: 15}]}
                onPress={() => setIsModalVisible(true)}>
                <Text style={styles.txtAa}>Aa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCloser}
                onPress={handleUploadStory}>
                <ChevronRight size={24} color={'#fff'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* <View style={styles.mediaItems}>{renderProgressBar()}</View> */}
          <View style={styles.mediaWrapper}>
            <TouchableWithoutFeedback onPress={handleScreenTap}>
              <View style={styles.mediaTouchArea}>
                {selectedItem ? (
                  selectedItem.type.includes('video') ? (
                    <TouchableOpacity onPress={() => setIsPause(!isPause)}>
                      <Video
                        ref={videoRef}
                        source={{uri: selectedItem.uri}}
                        style={styles.media}
                        resizeMode="contain"
                        repeat={false}
                        paused={isPause}
                        onLoad={onVideoLoad}
                        onProgress={onVideoProgress}
                        onEnd={onVideoEnd}
                        playInBackground={false}
                        playWhenInactive={false}
                      />
                      {isPause && <Play size={20} color={Colors.white} />}
                    </TouchableOpacity>
                  ) : (
                    <Image
                      source={{uri: selectedItem.uri}}
                      style={styles.media}
                      resizeMode="contain"
                    />
                  )
                ) : (
                  <Text style={styles.errorText}>
                    Không có media để hiển thị
                  </Text>
                )}
                {renderCaption()}
              </View>
            </TouchableWithoutFeedback>
          </View>
          <View style={styles.controls} />
          <Modal
            visible={isModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setIsModalVisible(false);
            }}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TextInput
                  style={styles.textInput}
                  value={caption}
                  onChangeText={onChangeCaption}
                  placeholderTextColor="#aaa"
                  multiline
                  autoFocus
                  returnKeyType="done"
                />

                {filteredSuggestions.length > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: '56%',
                      left: 20,
                      right: 20,
                      backgroundColor: '#222',
                      borderRadius: 8,
                    }}>
                    {filteredSuggestions.map((user, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleSuggestionPress(user)}
                        style={{padding: 10}}>
                        <Text style={{color: '#fff'}}>@{user.handleName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleDonePress}>
                  <Text style={styles.doneButtonText}>Xong</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal visible={isUploading} transparent animationType="fade">
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <LoadingModal />
              <Text style={{color: '#fff', marginTop: 10}}>
                Đang đăng story...
              </Text>
            </View>
          </Modal>

          <BottomSheet
            ref={sheetRef}
            onDoneSelect={(musicInfo: {
              musicId: string;
              timeStart: number;
              timeEnd: number;
              song: string;
              songImage: string;
            }) => {
              setSelectedMusic(musicInfo);
            }}
            songUrl={(url: string) => {
              setSongUrl(url);
            }}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

// ... (styles giữ nguyên như trước)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    marginRight: 15,
    marginLeft: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 50,
    marginTop: 5,
  },
  btnCloser: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: 'rgba(140, 137, 137, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCloser: {
    width: 15,
    height: 15,
    tintColor: '#fff',
  },
  mediaItems: {
    height: 35,
    marginBottom: 0,
    marginTop: 10,
  },
  mediaWrapper: {
    flex: 1,
    position: 'relative',
  },
  mediaTouchArea: {
    flex: 1,
    position: 'relative',
  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  progressContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 5,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: '#888',
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    flex: 1,
    padding: 15,
  },
  textInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 5,
    minWidth: 100,
    maxWidth: screenWidth * 0.8,
  },
  textInput: {
    position: 'absolute',
    top: '50%',
    width: 300,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  captionText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  doneButton: {
    position: 'absolute',
    top: 15,
    right: 0,
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    height: 50,
    padding: 15,
    alignItems: 'center',
  },
  txtAa: {
    fontWeight: '500',
    fontSize: 16,
    color: '#fff',
  },
  viewHeaderRight: {
    flexDirection: 'row',
  },
});
