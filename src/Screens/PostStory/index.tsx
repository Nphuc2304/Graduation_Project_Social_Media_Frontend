import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {FlatList} from 'react-native';
import CameraRoll from '@react-native-community/cameraroll';
import {useTheme} from '../../util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import {useNavigation} from '@react-navigation/native';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {ArrowLeft} from 'lucide-react-native';
import LoadingModal from '../../../components/Global/LoadingModal';

const ITEM_SIZE = Dimensions.get('window').width / 4;

interface MediaItem {
  uri: string;
  type: string;
  duration: number;
  id: string;
}

const PostStory = () => {
  const {theme} = useTheme();
  const color = Colors[theme];
  const navigation: any = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFetchingRef = useRef(false);

  const [isEndReachedTriggered, setIsEndReachedTriggered] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const permissions =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const results = await PermissionsAndroid.request(permissions);
      return results === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      GlobalAlertManager.show('Thông báo', 'Không thể yêu cầu quyền truy cập.');
      return false;
    }
  }, []);

  const loadMedia = useCallback(
    async (loadMore = false) => {
      if (isFetchingRef.current || (loadMore && !hasNextPage)) return;

      isFetchingRef.current = true;
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          setError('Không có quyền truy cập thư viện media.');
          return;
        }

        const result = await CameraRoll.getPhotos({
          first: 100,
          assetType: 'All',
          include: ['playableDuration', 'filename'],
          after: loadMore ? lastCursor || undefined : undefined,
        });

        const newMedia = result.edges.map(edge => ({
          uri: edge.node.image.uri,
          type: edge.node.type,
          duration: edge.node.image?.playableDuration || 0,
          id: edge.node.image.filename || edge.node.image.uri,
        }));

        setMediaList(prev => {
          const newList = loadMore ? [...prev, ...newMedia] : newMedia;
          return newList;
        });
        setLastCursor(result.page_info.end_cursor || null);
        setHasNextPage(result.page_info.has_next_page);
        if (loadMore) {
          setIsEndReachedTriggered(false);
          // Giữ nguyên vị trí scroll sau khi load thêm
          setTimeout(() => {
            if (flatListRef.current && scrollPosition > 0) {
              flatListRef.current.scrollToOffset({
                offset: scrollPosition,
                animated: false,
              });
            }
          }, 100);
        }
      } catch (err) {
        console.error('Lỗi khi tải media:', err);
        setError('Lỗi khi tải media.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [requestPermissions, lastCursor, hasNextPage],
  );

  const validateNavigationData = useCallback((item: MediaItem): boolean => {
    if (!item?.uri) {
      setError('Không thể chọn media này.');
      return false;
    }
    return true;
  }, []);

  const formatDuration = useCallback((duration: number) => {
    if (!duration || duration <= 0) return '00:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      if (!validateNavigationData(item)) {
        return;
      }
      navigation.navigate('EditStory', {
        selectedItem: item,
      });
    },
    [navigation, validateNavigationData],
  );

  const renderItem = useCallback(
    ({item}: {item: MediaItem}) => {
      const isVideo = item.type?.includes('video');

      return (
        <TouchableOpacity
          onPress={() => handleItemPress(item)}
          activeOpacity={0.8}>
          <View style={styles.thumbnailWrapper}>
            <Image source={{uri: item.uri}} style={styles.thumbnail} />
            {isVideo && (
              <View style={styles.durationContainer}>
                <Text style={styles.videoDuration}>
                  {formatDuration(item.duration)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [formatDuration, handleItemPress],
  );

  const keyExtractor = (item: MediaItem, index: number) =>
    `${item.id}_${index}`;

  const onEndReached = useCallback(() => {
    if (
      !isLoading &&
      !isLoadingMore &&
      hasNextPage &&
      !isFetchingRef.current &&
      !isEndReachedTriggered
    ) {
      setIsEndReachedTriggered(true);
      loadMedia(true);
    }
  }, [isLoading, isLoadingMore, hasNextPage, loadMedia, isEndReachedTriggered]);

  const onMomentumScrollBegin = useCallback(() => {
    setIsEndReachedTriggered(false);
  }, []);

  const onScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollPosition(offsetY);
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: color.background}]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('BottomTabs')}>
          <ArrowLeft size={22} color={color.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.mid}>
        <Text style={[styles.titleMid, {color: color.text}]}>
          Gần đây {'>'}
        </Text>
      </View>

      {isLoading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <LoadingModal />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mediaList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={4}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy media</Text>
          }
          ListFooterComponent={isLoadingMore ? <LoadingModal /> : null}
          onEndReachedThreshold={0.1}
          onEndReached={onEndReached}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onScroll={onScroll}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
          getItemLayout={(data, index) => ({
            length: ITEM_SIZE,
            offset: ITEM_SIZE * Math.floor(index / 4),
            index,
          })}
        />
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
    margin: 15,
  },
  headerIcon: {
    width: 20,
    height: 20,
  },
  icon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  mid: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
  },
  titleMid: {
    fontSize: 16,
    fontWeight: '500',
  },
  grid: {paddingLeft: 1},
  thumbnailWrapper: {
    position: 'relative',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: 1,
    marginBottom: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDuration: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default PostStory;
