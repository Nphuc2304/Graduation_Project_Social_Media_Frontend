import React, {SetStateAction, useCallback, useMemo, useState} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';
import {Colors} from '../../../../assets/color/Colors';
import {ItemHomeStyles} from '../component_styles/ItemHomeStyles';
import {Media} from '../../../../services/postRedux/postTypes';
import TagMarker from './TagMarker';
import {useNavigation} from '@react-navigation/native';
import {Play, Volume2, VolumeX} from 'lucide-react-native';
import {useVideoPause} from '../context/VideoPauseContext';
import LinearGradient from 'react-native-linear-gradient';

const screenWidth = Dimensions.get('window').width;

interface RenderMediaItemProps {
  item: Media;
  currentVisible: boolean;
  isFocused: boolean;
  muted: boolean;
  setSelectedImageUri?: React.Dispatch<React.SetStateAction<string | null>>;
}

interface RenderPaginationProps {
  media: Media[];
  currentIndex: number;
}

interface RenderMuteButtonProps {
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isPostWithoutMusic: boolean;
}

export const RenderMediaItem = React.memo(
  ({
    item,
    currentVisible,
    isFocused,
    muted,
    setSelectedImageUri,
  }: RenderMediaItemProps) => {
    const [videoSize, setVideoSize] = useState({width: 0, height: 0});
    const navigation = useNavigation<any>();
    const {
      isPaused: isVideoPausedByUser,
      addPausedVideo,
      removePausedVideo,
    } = useVideoPause();

    // Logic pause:
    const videoId = item._id.toString();
    const isUserPaused = isVideoPausedByUser(videoId);
    const shouldPause = isUserPaused || !currentVisible || !isFocused;

    const videoResizeMode = useMemo(() => {
      if (videoSize.height > videoSize.width) return 'cover';
      return 'contain';
    }, [videoSize]);

    const handleTagPress = useCallback(
      (userId: string) => {
        navigation.navigate('ProfileComp', {userID: userId});
      },
      [navigation],
    );
    const handleVideoPress = useCallback(() => {
      if (isUserPaused) {
        removePausedVideo(videoId);
      } else {
        addPausedVideo(videoId);
      }
    }, [isUserPaused, videoId, addPausedVideo, removePausedVideo]);

    return (
      <View style={{width: screenWidth, height: item.videoUrl ? 600 : 520}}>
        {item.videoUrl ? (
          <TouchableOpacity onPress={handleVideoPress} activeOpacity={1}>
            <View style={{position: 'relative'}}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={style.overlayHeader}
              />
              <Video
                source={{uri: item.videoUrl}}
                resizeMode={videoResizeMode}
                style={{width: screenWidth, height: 600}}
                repeat
                paused={shouldPause}
                poster={item.videoUrl}
                muted={muted}
                playInBackground={false}
                progressUpdateInterval={500}
                onLoad={({naturalSize}) => {
                  setVideoSize({
                    width: naturalSize.width,
                    height: naturalSize.height,
                  });
                }}
              />
              {shouldPause && (
                <View style={style.playButtonOverlay}>
                  <Play size={28} color={Colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              if (setSelectedImageUri) setSelectedImageUri(item.imageUrl ?? '');
            }}>
            <Image
              source={{uri: item.imageUrl ?? ''}}
              style={[style.img, {width: screenWidth}]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Hiển thị các tag (nếu có) */}
        {item.tags?.length > 0 &&
          item.tags?.map((tag, index) => (
            <TagMarker
              key={`${tag.userId}_${index}`}
              tag={tag}
              screenWidth={screenWidth}
              imageHeight={item.videoUrl ? 600 : 520}
              onPress={userId => handleTagPress(userId)}
            />
          ))}
      </View>
    );
  },
);

export const RenderPagination = React.memo(
  ({media, currentIndex}: RenderPaginationProps) => {
    if (media.length <= 1) return null;
    return (
      <View style={ItemHomeStyles.pagination}>
        {media.map((_, index) => (
          <View
            key={index}
            style={[
              ItemHomeStyles.dot,
              {
                backgroundColor:
                  index === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
              },
            ]}
          />
        ))}
      </View>
    );
  },
);

export const RenderMuteButton = React.memo(
  ({muted, setMuted, isPostWithoutMusic}: RenderMuteButtonProps) => {
    if (isPostWithoutMusic) return null;

    return (
      <TouchableOpacity
        style={ItemHomeStyles.muteButton}
        onPress={() => setMuted(!muted)}>
        {muted ? (
          <VolumeX size={22} color={Colors.dark.text} />
        ) : (
          <Volume2 size={22} color={Colors.dark.text} />
        )}
      </TouchableOpacity>
    );
  },
);

const style = StyleSheet.create({
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  img: {
    height: 520,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 140,
    backgroundColor: 'transparent',
  },
});
