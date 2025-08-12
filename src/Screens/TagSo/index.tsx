import {
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {PhotoIdentifier} from '@react-native-community/cameraroll';
import RenderImg from './Components/RenderImg';
import {useTheme} from '../../../src/util/ThemeContext';
import {TagSoStyles} from '../../../src/StyleSheet/TagSoStyles';
import ModalSearch from './Components/ModalSearch';
import {UserProfile} from '@services/relationRedux/relationTypes';
import User from './Components/User';

export type TagUser = {
  user: UserProfile;
  position: {x: number; y: number};
};

export type TaggedMedia = PhotoIdentifier & {
  tags: TagUser[];
};

export const TagSo = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const {
    selectedMedia,
  }: {
    selectedMedia: TaggedMedia[];
  } = route.params as any;
  const [media, setMedia] = useState<TaggedMedia[]>(selectedMedia);
  const {theme} = useTheme();
  const styles = TagSoStyles(theme);
  const [visible, setVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [update, setUpdate] = useState<TaggedMedia[]>(media);
  const isVideo = media[0].node.type.startsWith('video');

  const handleSelectUser = (user: UserProfile) => {
    const newMedia = [...media];
    const newUpdate = [...update];

    const currentMedia = newMedia[currentImageIndex];
    const currentUpdate = newUpdate[currentImageIndex];

    const currentTags = currentMedia.tags ?? [];
    const currentUpdateTags = currentUpdate.tags ?? [];

    const exists = currentUpdateTags.find(u => u.user._id === user._id);
    if (!exists) {
      const newTag = {
        user,
        position: {x: 0.5, y: 0.5},
      };

      // Cập nhật media hiển thị (nếu cần dùng hiển thị tag)
      newMedia[currentImageIndex] = {
        ...currentMedia,
        tags: [...currentTags, newTag],
      };

      // Cập nhật vị trí lưu trữ (chính xác nhất)
      newUpdate[currentImageIndex] = {
        ...currentUpdate,
        tags: [...currentUpdateTags, newTag],
      };

      setMedia(newMedia);
      setUpdate(newUpdate);
    }
  };

  const handleRemoveTag = (user: TagUser) => {
    const newMedia = media.map((m, index) => {
      if (index === currentImageIndex) {
        const newTags = (m.tags ?? []).filter(
          tag => tag.user._id !== user.user._id,
        );
        return {
          ...m,
          tags: JSON.parse(JSON.stringify(newTags)), // clone sâu
        };
      }
      return m;
    });

    const newUpdate = update.map((u, index) => {
      if (index === currentImageIndex) {
        const newTags = (u.tags ?? []).filter(
          tag => tag.user._id !== user.user._id,
        );
        return {
          ...u,
          tags: JSON.parse(JSON.stringify(newTags)), // clone sâu
        };
      }
      return u;
    });

    setMedia(newMedia);
    setUpdate(newUpdate);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gắn thẻ người dùng</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              navigation.navigate({
                name: 'PostSetting',
                params: {updated: update},
                merge: true, // giữ lại params cũ nếu có
              });
            }}>
            <Text style={styles.textBtn}>Xong</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.imgContainer, {height: isVideo ? 600 : 480}]}>
          <RenderImg
            media={media}
            setPosition={(mediaIndex, tagIndex, position) => {
              setUpdate(prev => {
                const updated = [...prev];
                const media = {...updated[mediaIndex]};
                const tags = [...(media.tags || [])];

                tags[tagIndex] = {
                  ...tags[tagIndex],
                  position: position,
                };

                media.tags = tags;
                updated[mediaIndex] = media;
                return updated;
              });
            }}
            onImageChange={(index: number) => setCurrentImageIndex(index)}
          />
        </View>
        <TouchableOpacity
          style={styles.btnAdd}
          onPress={() => setVisible(true)}>
          <Text style={[styles.title, {fontSize: 14}]}>Gắn thẻ bạn bè</Text>
        </TouchableOpacity>
        <View
          style={[styles.container, {paddingHorizontal: 24, paddingTop: 20}]}>
          {media[currentImageIndex].tags.length > 0 ? (
            <FlatList
              data={media[currentImageIndex].tags}
              keyExtractor={(_item, index) => index.toString()}
              renderItem={item => {
                return (
                  <User
                    image={item.item.user.profilePic}
                    name={item.item.user.username}
                    handle={item.item.user.handleName}
                    isDelete={true}
                    func={() => {
                      handleRemoveTag(item.item);
                    }}
                  />
                );
              }}
            />
          ) : (
            <Text style={styles.textNoti}>Gắn thẻ người dùng vào ảnh</Text>
          )}
        </View>
      </View>
      <ModalSearch
        visible={visible}
        setVisible={setVisible}
        mediaCurrent={media[currentImageIndex]}
        onSelectUser={(item: UserProfile) => handleSelectUser(item)}
      />
    </SafeAreaView>
  );
};
