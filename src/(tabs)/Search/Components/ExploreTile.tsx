import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';
import React from 'react';
import { Media } from '@services/postRedux/postTypes';
import { useNavigation } from '@react-navigation/native';
import { Layers, Video as VideoIcon } from 'lucide-react-native';

export interface ExploreMedia {
  _id: string;
  media: Media[];
}

interface ExploreSectionProps {
  data: ExploreMedia[];
  media: ExploreMedia[];
  index: number;
}

const screenWidth = Dimensions.get('window').width;
const GAP = 2;
const SMALL = (screenWidth - GAP * 3) / 3;
const BIG = SMALL * 2 + GAP;

const ExploreSection: React.FC<ExploreSectionProps> = ({
  media,
  index,
  data,
}) => {
  const navigation = useNavigation<any>();
  if (!media || !Array.isArray(media) || media.length === 0) return null;

  const allMedia: Media[] = media
    .map(exploreMedia => exploreMedia?.media?.[0])
    .filter(Boolean);
  if (allMedia.length === 0) return null;

  const isReversed = index % 2 === 0;
  const bigMedia = allMedia.find(m => m?.videoUrl) || allMedia[0];
  const smallMedias = allMedia
    .filter(m => m?._id !== bigMedia?._id)
    .slice(0, 4);

  const handleMediaPress = (
    exploreMediaId: string,
    _isBigMedia: boolean = false,
  ) => {
    navigation.navigate('AllPostOfCollection', {
      posts: [],
      targetPostId: exploreMediaId,
      playlistName: 'Bài viết',
      isSimilar: true,
    });
  };

  const renderMediaItem = (item: Media, isBigMedia: boolean = false) => {
    if (!item) return null;

    const isVideo = !!item.videoUrl;
    const parentExploreMedia = media.find(em =>
      em?.media?.some(m => m?._id === item._id),
    );
    const showOverlay =
      !isVideo && (parentExploreMedia?.media?.length || 0) > 1;

    return (
      <View
        style={
          isBigMedia ? styles.bigMediaContainer : styles.smallMediaContainer
        }>
        {isVideo ? (
          <Video
            source={{ uri: item.videoUrl }}
            style={styles.media}
            poster={item.imageUrl || item.videoUrl}
            resizeMode="cover"
            paused={true}
            muted={true}
            controls={false}
            repeat={false}
            pointerEvents="none"
          />
        ) : item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.media}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.media, styles.placeholder]}>
            <VideoIcon size={isBigMedia ? 40 : 24} color="#666" />
          </View>
        )}

        {/* Overlay trong suốt để đảm bảo touch hoạt động */}
        {isVideo && <View style={styles.touchOverlay} />}
        
        {(isVideo || showOverlay) && (
          <View style={styles.overlayContainer}>
            {isVideo ? (
              <VideoIcon size={22} color="white" />
            ) : (
              <Layers size={22} color="white" />
            )}
          </View>
        )}
      </View>
    );
  };

  const bigMediaParent = media.find(em =>
    em?.media?.some(m => m?._id === bigMedia?._id),
  );

  return (
    <View
      style={[
        styles.row,
        isReversed && styles.rowReverse,
        { marginBottom: GAP },
      ]}>
      <View style={isReversed ? styles.marginLeft : styles.marginRight}>
        <TouchableOpacity
          onPress={() => handleMediaPress(bigMediaParent?._id || '', true)}
          activeOpacity={0.8}
        >
          {renderMediaItem(bigMedia, true)}
        </TouchableOpacity>
      </View>

      <View style={styles.smallMediaGrid}>
        {smallMedias.map((item, idx) => {
          const smallMediaParent = media.find(em =>
            em?.media?.some(m => m?._id === item?._id),
          );

          return (
            <TouchableOpacity
              key={item?._id || `small-media-${idx}`}
              onPress={() =>
                smallMediaParent && handleMediaPress(smallMediaParent._id)
              }
              activeOpacity={0.8}
              style={[
                styles.smallMediaWrapper,
                {
                  marginRight: idx % 2 === 1 ? 0 : GAP,
                  marginBottom: GAP,
                },
              ]}>
              {renderMediaItem(item)}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: GAP / 2,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  marginRight: {
    marginRight: GAP,
  },
  marginLeft: {
    marginLeft: GAP,
  },
  bigMediaContainer: {
    width: SMALL,
    height: BIG,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  smallMediaContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  smallMediaGrid: {
    width: BIG,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  smallMediaWrapper: {
    width: SMALL,
    height: SMALL,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayIcon: {
    width: 18,
    height: 18,
    tintColor: 'white',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
});

export default React.memo(ExploreSection);
