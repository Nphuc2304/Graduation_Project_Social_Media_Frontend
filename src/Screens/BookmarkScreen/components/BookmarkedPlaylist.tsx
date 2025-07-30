import React, {useEffect, useState} from 'react';
import {View, Text, Image, Platform, ActivityIndicator} from 'react-native';
import {useBookmarkStyles} from '../../../StyleSheet/BookmarkedStyles';
import {Colors} from '../../../../assets/color/Colors';
import {Plus} from 'lucide-react-native';
import {createThumbnail} from 'react-native-create-thumbnail';

interface Props {
  title: string;
  thumbnails: string[]; // video URLs
  coverImg: string; // fallback image
}

const BookmarkedPlaylist: React.FC<Props> = ({title, thumbnails, coverImg}) => {
  const styles = useBookmarkStyles();
  const [thumbUris, setThumbUris] = useState<string[]>([]);

  useEffect(() => {
    // Validate URLs and categorize them as images or videos
    const isValidUrl = (url: string): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (trimmed.length === 0) return false;
      if (!trimmed.startsWith('http')) return false;
      if (trimmed === 'null' || trimmed === 'undefined') return false;
      if (trimmed.length < 10) return false;
      return true;
    };

    const isImageUrl = (url: string): boolean => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    const isVideoUrl = (url: string): boolean => {
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
      return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Filter and categorize valid URLs
    const validUrls = thumbnails?.filter(isValidUrl).slice(0, 4) || [];
    const imageUrls = validUrls.filter(isImageUrl);
    const videoUrls = validUrls.filter(isVideoUrl);

    if (validUrls.length === 0) {
      setThumbUris([]);
      return;
    }

    const processUrls = async () => {
      const results: string[] = [];

      imageUrls.forEach(url => {
        results.push(url);
      });

      if (videoUrls.length > 0) {
        const videoThumbnails = await Promise.all(
          videoUrls.map(async (uri) => {
            try {
              const result = await createThumbnail({
                url: uri,
                timeStamp: 2000
              });

              const path = result.path;
              if (!path) return null;

              // Android needs file:// prefix
              const finalPath = Platform.OS === 'android' && !path.startsWith('file://')
                ? `file://${path}`
                : path;

              return finalPath;
            } catch (error) {
              return null;
            }
          })
        );
        videoThumbnails.forEach(thumb => {
          if (thumb) results.push(thumb);
        });
      }

      setThumbUris(results);
    };

    processUrls();
  }, [thumbnails, title]);

  if (thumbUris === null) {
    return (
      <View style={styles.playlistContainer}>
        <View style={[styles.fullImage, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color={Colors.textSecondary} />
        </View>
        <Text style={styles.playlistTitle}>{title}</Text>
      </View>
    );
  }

  // Nếu có thumbnail valid thì dùng, không thì coverImg
  const images = thumbUris.length > 0 ? thumbUris : [coverImg];

  const renderGrid = () => {
    const count = images.length;

    if (count === 1) {
      return images[0] === coverImg ? (
        <View
          style={[
            styles.fullImage,
            {justifyContent: 'center', alignItems: 'center'},
          ]}>
          <Plus size={50} color={Colors.textSecondary} />
        </View>
      ) : (
        <Image
          source={{uri: images[0]}}
          style={styles.fullImage}
          resizeMode="cover"
        />
      );
    }

    if (count === 2) {
      return (
        <View style={styles.row}>
          {images.map((uri, i) => (
            <Image
              key={i}
              source={{uri}}
              style={styles.halfImage}
              resizeMode="cover"
            />
          ))}
        </View>
      );
    }

    if (count === 3) {
      return (
        <View style={styles.grid3Container}>
          <View style={styles.grid3Row}>
            <Image
              source={{uri: images[0]}}
              style={styles.grid3TopImage}
              resizeMode="cover"
            />
            <Image
              source={{uri: images[1]}}
              style={styles.grid3TopImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.grid3BottomWrapper}>
            <Image
              source={{uri: images[2]}}
              style={styles.grid3BottomImage}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    }

    // 4+ ảnh
    return (
      <View style={styles.gridContainer}>
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{uri}}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.playlistContainer}>
      {renderGrid()}
      <Text style={styles.playlistTitle}>{title}</Text>
    </View>
  );
};

export default BookmarkedPlaylist;
