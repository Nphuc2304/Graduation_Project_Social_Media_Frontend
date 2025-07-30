import React, {useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useBookmarkStyles} from '../../StyleSheet/BookmarkedStyles';
import BookmarkedPlaylist from './components/BookmarkedPlaylist';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {getAllPlaylists} from '../../../services/bookmarkRedux/bookmarkSlice';
import {Playlist} from '../../../services/bookmarkRedux/bookmarkTypes';
import {useTheme} from '../../../src/util/ThemeContext';
import {Colors} from '@assets/color/Colors';
import {ArrowLeft, Plus} from 'lucide-react-native';
import LoadingModal from '../../../components/Global/LoadingModal';

export const BookmarkScreen = () => {
  const navigation = useNavigation<any>();
  const styles = useBookmarkStyles();
  const dispatch = useDispatch<AppDispatch>();
  const {theme} = useTheme();
  const colors = Colors[theme];

  const {refreshToken} = useSelector((state: RootState) => state.user);
  const {playlists, isloading} = useSelector(
    (state: RootState) => state.bookmark,
  );

  // Lấy danh sách playlist lần đầu
  useFocusEffect(
    useCallback(() => {
      if (refreshToken) {
        dispatch(getAllPlaylists({refreshToken}));
      }
    }, [dispatch, refreshToken]),
  );

  const handlePlaylistPress = (playlistId: string, title: string) => {
    if (title === 'Âm nhạc') {
      navigation.navigate('MusicSavedScreen', {playlistId, title});
    } else {
      navigation.navigate('PlaylistsScreen', {playlistId, title});
    }
  };

  const renderPlaylistItem = ({item}: {item: Playlist}) => {
    return (
      <TouchableOpacity
        style={styles.columnItem}
        onPress={() => handlePlaylistPress(item._id, item.playlistName)}>
        <BookmarkedPlaylist
          title={item.playlistName}
          thumbnails={item.thumbnails || []}
          coverImg={item.coverImg}
        />
      </TouchableOpacity>
    );
  };

  if (isloading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <LoadingModal />
      </SafeAreaView>
    );
  } else {
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đã lưu</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddCollection' as never)}>
            <Plus size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Danh sách playlist */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={item => item._id}
            numColumns={2}
            columnWrapperStyle={styles.playlistRow}
            scrollEnabled={false}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
