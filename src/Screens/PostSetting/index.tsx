import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useTheme} from '../../util/ThemeContext';
import {getAddPostStyles} from '../../StyleSheet/AddPostStyles';
import {FlashList} from '@shopify/flash-list';
import {Colors} from '../../../assets/color/Colors';
import Section from '../../../components/Section';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {uploadPostWithMedia} from '../../../services/postRedux/postSlice';
import VideoModal from './Components/VideoModal';
import BottomSheet, {
  BottomSheetRef,
} from '../PostStory/BottomSheet/BottomSheetMusic';
import {uploadImageToR2, uploadVideoToR2} from '../../core/upload';
import {useUploadProgress} from '../../../services/UploadProgressManager';
import {PhotoIdentifier} from '@react-native-community/cameraroll';
import {TaggedMedia} from '../TagSo';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {checkProfanityAndAlert} from '../../util/profanityFilter';
import {fetchFollowers} from '@services/relationRedux/relationSlice';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Clapperboard,
  UserPlus2,
  Music2,
  ChevronRight,
} from 'lucide-react-native';
import {useHeadAlert} from '../../../components/Global/HeadAlertProvider';

export const PostSetting = () => {
  const {theme} = useTheme();
  const color = Colors[theme];
  const styles = getAddPostStyles(theme);
  const {showAlert} = useHeadAlert();
  const navigation: any = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const user = useSelector((state: RootState) => state.user.user);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const route = useRoute();
  const {selectedMedia, updated} = route.params as {
    selectedMedia: PhotoIdentifier[];
    updated?: TaggedMedia[];
  };

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchFollowers({userId: user._id}));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (updated) {
        setMediaWithTags(updated);
      }
    }, [updated]),
  );

  const [mediaWithTags, setMediaWithTags] = useState<TaggedMedia[]>(
    selectedMedia.map(item => ({...item, tags: []})),
  );

  const [caption, setCaption] = useState('');
  const [isModal, setIsModal] = useState(false);
  const {showUploadModal, hideUploadModal, setProgress} = useUploadProgress();

  const handleUploadAll = async () => {
    if (!mediaWithTags || mediaWithTags.length === 0) {
      GlobalAlertManager.show(
        'Chưa chọn phương tiện',
        'Hãy chọn ảnh hoặc video',
      );
      return;
    }

    if (checkProfanityAndAlert(caption)) return;

    if (caption.length > 1000) {
      showAlert('Lỗi', 'Nội dung vượt quá giới hạn cho phép (1000 từ).');
      return;
    }

    try {
      const uploadedMedia: any[] = [];
      for (const media of mediaWithTags) {
        const uri = media.node.image.uri;
        const isVideo = media.node.type.startsWith('video');
        let uploadedItem: any = {};

        if (isVideo) {
          const videoUrl = await uploadVideoToR2(uri, {
            showUploadModal,
            hideUploadModal,
            setProgress,
          });
          uploadedItem.videoUrl = videoUrl;
        } else {
          const imageUrl = await uploadImageToR2(uri, {
            showUploadModal,
            hideUploadModal,
            setProgress,
          });
          uploadedItem.imageUrl = imageUrl;
        }

        if (media.tags?.length) {
          uploadedItem.tags = media.tags.map(tag => ({
            userId: tag.user._id,
            handleName: tag.user.username,
            positionX: tag.position.x,
            positionY: tag.position.y,
          }));
        }

        uploadedMedia.push(uploadedItem);
      }

      const postType =
        uploadedMedia.length === 1 && uploadedMedia[0].videoUrl
          ? 'reel'
          : 'post';

      const body = {
        post: {
          type: postType,
          caption,
          isEnable: true,
        },
        media: uploadedMedia,
        music: selectedMusic
          ? {
              musicId: selectedMusic.musicId,
              timeStart: selectedMusic.timeStart,
              timeEnd: selectedMusic.timeEnd,
            }
          : undefined,
      };

      const resultAction = await dispatch(
        uploadPostWithMedia({payload: body, handleName: user?.username}),
      );

      if (uploadPostWithMedia.fulfilled.match(resultAction)) {
        showAlert('🎉 Thành công', 'Bài viết đã được tải lên!');
        setMediaWithTags([]);
      } else {
        showAlert('Thất bại', 'Tải lên thất bại');
        setMediaWithTags([]);
      }
    } catch (error) {
      showAlert('Lỗi', 'Đã có lỗi khi upload');
    }
  };

  const countAllTag = (media: TaggedMedia[]): number => {
    const uniqueUserIds = new Set<string>();

    media.forEach(item => {
      item.tags?.forEach(tag => {
        if (tag.user?._id) {
          uniqueUserIds.add(tag.user._id);
        }
      });
    });

    return uniqueUserIds.size;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.rowSpace}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={color.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bài viết mới</Text>
        <View style={styles.iconR}></View>
      </View>

      <Animated.ScrollView
        style={styles.container}
        onScroll={scrollHandler}
        scrollEventThrottle={16}>
        <View
          style={[
            {
              backgroundColor: color.transparent,
              justifyContent: 'center',
              marginLeft: 20,
            },
            selectedMedia.length === 1 && {alignItems: 'center'},
          ]}>
          {selectedMedia.length > 1 ? (
            <FlashList
              data={selectedMedia}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({item}: {item: PhotoIdentifier}) => (
                <Image
                  source={{uri: item.node.image.uri}}
                  style={styles.imgShow}
                />
              )}
              estimatedItemSize={200}
            />
          ) : (
            <TouchableOpacity
              onLongPress={() => {
                if (selectedMedia[0].node.type.startsWith('video')) {
                  setIsModal(true);
                }
              }}>
              <Image
                source={{uri: selectedMedia[0].node.image.uri}}
                style={styles.imgShow}
              />
              {selectedMedia[0].node.type.startsWith('video') && (
                <View style={styles.reelsContainer}>
                  <Clapperboard size={22} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          placeholder="Thêm chú thích"
          placeholderTextColor={color.textSecondary}
          style={styles.textIn}
          multiline
          textAlignVertical="top"
          value={caption}
          onChangeText={setCaption}
        />

        <Section
          title="Gắn thẻ người khác"
          iconLeft={<UserPlus2 size={22} color={color.text} />}
          iconRight={<ChevronRight size={22} color={color.textSecondary} />}
          backData={countAllTag(mediaWithTags).toString()}
          func={() =>
            navigation.navigate('TagSo', {selectedMedia: mediaWithTags})
          }
        />
        {!selectedMedia[0].node.type.startsWith('video') && (
          <Section
            title={selectedMusic?.song ?? 'Thêm nhạc'}
            iconLeft={<Music2 size={22} color={color.text} />}
            iconRight={<ChevronRight size={22} color={color.textSecondary} />}
            func={() => sheetRef.current?.open()}
          />
        )}
      </Animated.ScrollView>

      <TouchableOpacity
        style={styles.btnShare}
        onPress={() => {
          handleUploadAll();
          navigation.reset({
            index: 0,
            routes: [{name: 'BottomTabs'}],
          });
        }}>
        <Text style={styles.textBtn}>Đăng bài</Text>
      </TouchableOpacity>

      <VideoModal
        uri={selectedMedia[0]?.node?.image?.uri}
        visible={isModal}
        onClose={() => setIsModal(false)}
      />

      <BottomSheet
        ref={sheetRef}
        onDoneSelect={(musicInfo: {
          musicId: string;
          timeStart: number;
          timeEnd: number;
          song: string;
          songImage: string;
        }) => {
          if (musicInfo.musicId === '') {
            setSelectedMusic(null);
          } else {
            setSelectedMusic(musicInfo);
          }
        }}
      />
    </SafeAreaView>
  );
};
