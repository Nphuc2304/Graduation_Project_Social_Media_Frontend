import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import VideoPlayer, { VideoRef } from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Modalize } from 'react-native-modalize';
import { Portal } from 'react-native-portalize';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../services/store';
import { useBookmarkStyles } from '../../StyleSheet/BookmarkedStyles';
import { useTheme } from '../../util/ThemeContext';
import { Colors } from '../../../assets/color/Colors';
import {
  deletePlaylist,
  getItemsOfPlaylist,
  removeBookmark,
  reNamePalylistBookmark,
  switchBookmark,
} from '../../../services/bookmarkRedux/bookmarkSlice';
import { FlashList } from '@shopify/flash-list';
import { GlobalAlertManager } from '../../../components/Global/AlertModal';
import { PlaylistItem, Media, MediaR } from '@services/bookmarkRedux/bookmarkTypes';
import {
  ArrowLeft,
  MoreVertical,
  LayoutGrid,
  Clapperboard,
  X,
  Check,
  Video,
} from 'lucide-react-native';

interface RouteParams {
  title: string;
  playlistId: string;
}

export const PlaylistsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { title, playlistId } = route.params as RouteParams;

  const styles = useBookmarkStyles();
  const { theme } = useTheme();
  const palette = Colors[theme];

  const dispatch = useDispatch<AppDispatch>();
  const { itemsByPlaylist, playlists } = useSelector((state: RootState) => state.bookmark);
  const [playlistItems, setPlaylistItems] = useState(itemsByPlaylist[playlistId] ?? []);
  const isLoading = useSelector((s: RootState) => s.bookmark.isloading);
  const { refreshToken } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState<'grid' | 'reels'>('grid');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isSelec, setIsSelect] = useState(false);
  const [listSelected, setListSelected] = useState<string[]>([]);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [titleMain, setTitle] = useState(title);

  const modalizeRef = useRef<Modalize>(null);
  const selectRef = useRef<Modalize>(null);
  const switchRef = useRef<Modalize>(null);
  const renameRef = useRef<Modalize>(null);
  const videoRef = useRef<VideoRef>(null);

  const anotherplaylist = playlists.filter(
    p => p._id !== playlistId && p.playlistName !== 'Âm nhạc',
  );

  useEffect(() => {
    dispatch(getItemsOfPlaylist({ playlistId, refreshToken }));
    setSelectedItem(null);
    modalizeRef.current?.close();
  }, [dispatch, playlistId]);

  useEffect(() => {
    setPlaylistItems(itemsByPlaylist[playlistId] ?? []);
  }, [itemsByPlaylist]);

  const openItem = (item: PlaylistItem) => {
    if (activeTab === 'grid') {
      navigation.navigate('AllPostOfCollection' as never, {
        posts: playlistItems,
        targetPostId: item._id,
        playlistName: title,
        clickableHashtag: true,
        clearSearchRedux: true,
      } as never);
    } else {
      navigation.navigate('AllReels', { reels: playlistItems, initialId: item._id });
    }
  };

  const toggleSelect = (id: string) => {
    setListSelected(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const isAllSelected = listSelected.length === playlistItems.length;
  const handleToggleAll = () =>
    isAllSelected ? setListSelected([]) : setListSelected(playlistItems.map(i => i._id));
  const handleCancel = () => {
    setIsSelect(false);
    setListSelected([]);
  };
  const handleRight = () => {
    if (isSelec) handleToggleAll();
    else selectRef.current?.open();
  };

  const renderItemThumb = useCallback(
    (item: PlaylistItem) => {
      const isVideo = item.type === 'reel';
      if (!item.media || item.media.length === 0) {
        return null;
      }

      const isSelected = listSelected.includes(item._id);
      const url = isVideo ? (item.media[0] as Media).videoUrl : (item.media[0] as MediaR)?.imageUrl;
      const isMP4Video = url && url.endsWith('.mp4');

      return (
        <TouchableOpacity
          style={styles.postItem}
          onPress={() => (isSelec ? toggleSelect(item._id) : openItem(item))}>
          {isMP4Video ? (
            <VideoPlayer
              source={{ uri: url }}
              style={styles.postImage}
              resizeMode="cover"
              paused
              muted
            />
          ) : (
            <Image
              source={{ uri: url }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}
          {isVideo && (
            <View style={styles.videoIconContainer}>
              <Video size={22} color="#fff" />
            </View>
          )}
          {isSelec && (
            <View style={styles.overlay}>
              {isSelected && <Check size={18} color="#fff" />}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [listSelected, isSelec, toggleSelect, openItem, styles],
  );

  const GridContent = useCallback(() => {
    if (!playlistItems.length) return <Text>Không có bài viết nào.</Text>;
    return (
      <FlatList
        data={playlistItems}
        numColumns={3}
        renderItem={({ item }) => renderItemThumb(item)}
        keyExtractor={i => i._id!}
      />
    );
  }, [playlistItems, renderItemThumb]);

  const ReelsContent = useCallback(() => {
    const data = playlistItems.filter(i => i.type === 'reel');
    if (!data.length) return <Text>Không có thước phim nào.</Text>;
    return (
      <FlatList
        data={data}
        numColumns={3}
        renderItem={({ item }) => renderItemThumb(item)}
        keyExtractor={i => i._id!}
      />
    );
  }, [playlistItems, renderItemThumb]);

  const renderContent = useCallback(() => {
    return isLoading ? <Text>Đang tải...</Text> : activeTab === 'grid' ? <GridContent /> : <ReelsContent />;
  }, [isLoading, activeTab, playlistItems]);

  const switchPlaylist = useCallback(
    (id: string) => {
      dispatch(
        switchBookmark({
          postIds: listSelected,
          playlistId: id,
          refreshToken,
        }),
      )
        .unwrap()
        .then(() => {
          setPlaylistItems(prev => prev.filter(item => !listSelected.includes(item._id)));
          setIsSelect(false);
          setListSelected([]);
          switchRef.current?.close();
        })
        .catch(res => {
          GlobalAlertManager.show('Lỗi', res?.response?.data?.message || 'Chuyển danh mục thất bại.');
        });
    },
    [listSelected, refreshToken, dispatch],
  );

  const removeListBookmark = useCallback(() => {
    dispatch(removeBookmark({ postIds: listSelected, refreshToken }))
      .unwrap()
      .then(() => {
        setPlaylistItems(prev => prev.filter(item => !listSelected.includes(item._id)));
        setIsSelect(false);
        setListSelected([]);
        switchRef.current?.close();
      })
      .catch(res => {
        GlobalAlertManager.show('Lỗi', res?.response?.data?.message || 'Bỏ lưu thất bại.');
      });
  }, [listSelected, refreshToken, dispatch]);

  return (
    <SafeAreaView style={styles.playlistsContainer}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.playlistsHeader}>
        <View style={[styles.headerSlot, styles.headerSlotLeft]}>
          <TouchableOpacity onPress={() => (isSelec ? handleCancel() : navigation.goBack())}>
            {isSelec ? <Text style={styles.textTop}>Hủy bỏ</Text> : <ArrowLeft size={24} color={palette.text} />}
          </TouchableOpacity>
        </View>

        <View style={styles.headerSlot}>
          <Text style={styles.headerTitle} numberOfLines={1}>{titleMain}</Text>
        </View>

        <View style={[styles.headerSlot, styles.headerSlotRight]}>
          <TouchableOpacity onPress={handleRight}>
            {isSelec ? <Text style={styles.textTop}>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</Text> : <MoreVertical size={24} color={palette.text} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>{renderContent()}</View>

      {isSelec && (
        <View style={styles.bottomcontainer}>
          <TouchableOpacity
            style={[styles.bottomBtn, { opacity: listSelected.length > 0 ? 1 : 0.3 }]}
            disabled={listSelected.length === 0}
            onPress={removeListBookmark}>
            <Text style={styles.textBtn}>Bỏ lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBtn, { opacity: listSelected.length > 0 ? 1 : 0.3 }]}
            disabled={listSelected.length === 0}
            onPress={() => switchRef.current?.open()}>
            <Text style={styles.textBtn}>Chuyển danh mục lưu</Text>
          </TouchableOpacity>
        </View>
      )}

      <Portal>
        <Modalize ref={modalizeRef} modalStyle={{ backgroundColor: palette.background }} adjustToContentHeight withHandle={false} onClose={() => setSelectedItem(null)}>
          <View style={styles.modalizeContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => modalizeRef.current?.close()}>
              <X size={20} color={palette.text} />
            </TouchableOpacity>
            {selectedItem &&
              (selectedItem.type === 'reel' ? (
                <VideoPlayer ref={videoRef} source={{ uri: selectedItem.media[0]?.videoUrl }} style={styles.fullScreenVideo} poster={selectedItem.media[0]?.videoUrl} repeat={false} controls resizeMode="contain" paused muted />
              ) : (
                <Image source={{ uri: selectedItem.media[0]?.imageUrl }} style={styles.fullScreenImage} resizeMode="contain" />
              ))}
          </View>
        </Modalize>

        <Modalize ref={selectRef} adjustToContentHeight modalStyle={styles.modal} handleStyle={styles.handle} withHandle>
          <View style={styles.box}>
            <TouchableOpacity style={styles.option} onPress={() => { setIsSelect(true); selectRef.current?.close(); }}>
              <Text style={styles.optionText}>Chọn...</Text>
            </TouchableOpacity>

            {titleMain !== 'Tất cả bài đăng' && (
              <>
                <TouchableOpacity style={styles.option} onPress={() => { renameRef.current?.open(); selectRef.current?.close(); }}>
                  <Text style={styles.optionText}>Đổi tên danh mục</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancel} onPress={() => {
                  dispatch(deletePlaylist({ id: playlistId }))
                    .unwrap()
                    .then(() => { GlobalAlertManager.show('Thông báo', 'Xóa danh mục thành công.'); navigation.goBack(); })
                    .catch(err => { GlobalAlertManager.show('Lỗi', err?.message || 'Xóa danh mục thất bại.'); });
                  selectRef.current?.close();
                }}>
                  <Text style={styles.cancelText}>Xóa danh mục</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.cancel} onPress={() => selectRef.current?.close()}>
              <Text style={styles.cancelText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </Modalize>

        {/* Modal chuyển danh mục */}
        <Modalize ref={switchRef} adjustToContentHeight modalStyle={styles.modal} handleStyle={styles.handle} withHandle>
          <View style={{ width: '100%', height: 100 }}>
            {anotherplaylist.length > 0 ? (
              <FlashList
                data={anotherplaylist}
                horizontal
                estimatedItemSize={200}
                keyExtractor={item => item._id.toString()}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.anotherBox} onPress={() => switchPlaylist(item._id)}>
                    <Image source={{ uri: item.coverImg || item.thumbnails[0] }} style={styles.anotherImage} />
                    <Text style={styles.anotherText}>{item.playlistName}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={[styles.anotherText, { width: '100%', textAlign: 'center', marginTop: 20 }]}>Bạn hiện không có danh sách nào.</Text>
            )}
          </View>
        </Modalize>

        {/* Modal rename playlist */}
        <Modalize ref={renameRef} adjustToContentHeight withHandle modalStyle={styles.modal} handleStyle={styles.handle}>
          <View style={styles.box}>
            <Text style={[styles.optionText, { textAlign: 'center' }]}>Nhập tên danh sách mới</Text>
            <TextInput placeholder="Tên danh mục mới" value={newPlaylistName} onChangeText={setNewPlaylistName} style={{ borderColor: palette.border, borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 10, color: palette.text }} placeholderTextColor={palette.textSecondary} />

            <TouchableOpacity style={[styles.option, { marginTop: 10 }]} onPress={() => {
              if (!newPlaylistName.trim()) {
                GlobalAlertManager.show('Lỗi', 'Tên danh mục không được để trống.');
                return;
              }
              dispatch(reNamePalylistBookmark({ id: playlistId, playlistName: newPlaylistName.trim() }))
                .unwrap()
                .then(() => { GlobalAlertManager.show('Thông báo', 'Đổi tên danh mục thành công.'); setTitle(newPlaylistName); setNewPlaylistName(''); renameRef.current?.close(); })
                .catch(err => { GlobalAlertManager.show('Lỗi', err?.message || 'Đổi tên danh mục thất bại.'); });
            }}>
              <Text style={styles.optionText}>Đổi tên</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancel} onPress={() => { setNewPlaylistName(''); renameRef.current?.close(); }}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </Modalize>
      </Portal>
    </SafeAreaView>
  );
};
