import React, {memo, useCallback} from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Message} from '../../../../services/messageRedux/messageType';
import {useTheme} from '../../../../src/util/ThemeContext';
import {Colors} from '@assets/color/Colors';
import {User} from '@services/userRedux/userTypes';
import {useSocket} from '@services/SocketContext';
import {useNavigation} from '@react-navigation/native';

interface MessageItemProps {
  roomId: string;
  item: Message;
  index: number;
  userHandleName: string;
  chat: Message[];
  setSelectedImageUri: (uri: string | null) => void;
  linkPreviews: {[key: number]: any};
  onLongPress: (content: Message) => void;
  isHighlighted?: boolean;
  userC: User | null;
}

const MessageItemComponent: React.FC<MessageItemProps> = memo(
  ({
    roomId,
    item,
    index,
    userHandleName,
    chat,
    setSelectedImageUri,
    linkPreviews,
    onLongPress,
    isHighlighted = false,
    userC,
  }) => {
    const {theme} = useTheme();
    const color = Colors[theme];
    const isMe = item.sender?.handleName === userHandleName;
    const prevMsg = chat[index - 1];
    const showAvatar =
      !prevMsg || prevMsg.sender?.handleName !== item.sender?.handleName;

    const {socket} = useSocket();
    const navigation = useNavigation<any>();

    const handleReCall = useCallback(() => {
      if (socket) {
        socket.emit('incomingCall', {
          callerName: userC?.username,
          type: 'voice',
          roomId,
        });
      }
      navigation.navigate('ZegoCallScreen', {
        userID: userC?._id,
        userName: userC?.username,
        callID: roomId,
        callType: 'voice',
        image: userC?.profilePic,
        isCaller: true,
      });
    }, [socket, userC, roomId, navigation]);

    const handleImagePress = useCallback(() => {
      setSelectedImageUri(item.media?.url ?? null);
    }, [setSelectedImageUri, item.media?.url]);

    const handleLongPress = useCallback(() => {
      onLongPress(item);
    }, [onLongPress, item]);

    const handleLinkPress = useCallback(() => {
      if (linkPreviews[index]?.url) {
        Linking.openURL(linkPreviews[index].url);
      }
    }, [linkPreviews, index]);

    /**
     * RenderAvatar if its a OtherUserMessage
     * and the first message or different from the previous sender
     */
    const renderAvatar = useCallback(
      () =>
        !isMe && showAvatar ? (
          <TouchableOpacity style={[styles.blockAvatar, {marginRight: 10}]}>
            <Image
              source={{uri: item.sender?.profilePic}}
              style={styles.avatar}
            />
          </TouchableOpacity>
        ) : null,
      [isMe, showAvatar, item.sender?.profilePic],
    );

    const renderContent = useCallback(() => {
      if (item.media?.type === 'image') {
        const filteredText = item.content
          .split(/(\s+)/)
          .filter(part => !/^https?:\/\/\S+$/i.test(part))
          .join('');

        return (
          <Pressable onPress={handleImagePress} onLongPress={handleLongPress}>
            <View
              style={{
                width: 150,
                height: 200,
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
              }}>
              <Image
                source={{uri: item.media.url}}
                style={{width: '100%', height: '100%'}}
                resizeMode="cover"
              />
              {filteredText !== '' && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                  }}>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 12,
                      lineHeight: 16,
                      fontWeight: '400',
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: {width: 0, height: 1},
                      textShadowRadius: 2,
                    }}
                    numberOfLines={3}
                    ellipsizeMode="tail">
                    {filteredText}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      }

      if (item.media?.type === 'call') {
        return (
          <View
            style={{
              backgroundColor: '#E6F7FF',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignItems: 'center',
              minWidth: 100,
            }}>
            <Text style={{color: '#007AFF', fontWeight: '600', fontSize: 14}}>
              {item.content}
            </Text>
            {item.media.duration && (
              <Text
                style={{
                  color: '#007AFF',
                  fontSize: 12,
                  marginTop: 4,
                }}>
                ⏱ {item.media.duration}
              </Text>
            )}
            <TouchableOpacity
              style={{
                marginTop: 8,
                backgroundColor: '#00BFFF',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                width: '90%',
              }}
              onPress={handleReCall}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                Gọi lại
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      const filteredText = item.content
        .split(/(\s+)/)
        .filter(part => !/^https?:\/\/\S+$/i.test(part))
        .join('');

      return (
        <>
          {filteredText !== '' && (
            <Text
              style={{
                color: color.text,
                textAlign: linkPreviews[index] && 'right',
                fontSize: 14,
              }}>
              {filteredText}
            </Text>
          )}
          {linkPreviews[index] && (
            <TouchableOpacity
              onPress={handleLinkPress}
              onLongPress={handleLongPress}
              style={{
                borderRadius: 8,
                backgroundColor: color.backgroundSecondary,
                marginTop: 5,
                maxWidth: 200,
              }}>
              {linkPreviews[index].images?.length > 0 && (
                <Image
                  source={{uri: linkPreviews[index].images[0]}}
                  style={{
                    width: '100%',
                    height: 140,
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                  resizeMode="cover"
                />
              )}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: color.text,
                  fontSize: 14,
                  marginBottom: 4,
                }}
                numberOfLines={2}
                ellipsizeMode="tail">
                {linkPreviews[index].title}
              </Text>
              {linkPreviews[index].description && (
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{color: 'gray', fontSize: 12}}>
                  {linkPreviews[index].description}
                </Text>
              )}
              <Text
                style={{color: '#007AFF', fontSize: 12, marginTop: 4}}
                numberOfLines={2}
                ellipsizeMode="tail">
                {linkPreviews[index].url}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    }, [
      item.media,
      item.content,
      handleImagePress,
      handleLongPress,
      handleLinkPress,
      color.text,
      color.backgroundSecondary,
      linkPreviews,
      index,
    ]);

    const renderMessageBubble = useCallback(() => {
      const maxShownReactions = 3;
      const displayedReactions =
        item.reactions?.slice(0, maxShownReactions) || [];
      const remainingCount =
        (item.reactions?.length || 0) - displayedReactions.length;

      if (item.isDeleted) {
        return (
          <View
            style={{
              marginLeft: isMe || showAvatar ? 0 : 40,
              marginRight: isMe ? 0 : 30,
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              backgroundColor: isMe
                ? 'rgba(0, 191, 255, 0.5)'
                : 'rgba(250, 250, 240, 0.5)',
              padding: 10,
              borderRadius: 8,
            }}>
            <Text
              style={{
                fontStyle: 'italic',
                color: '#666',
                fontSize: 14,
              }}>
              Tin nhắn đã bị thu hồi
            </Text>
          </View>
        );
      }

      return (
        <Pressable
          disabled={item.isDeleted}
          onLongPress={handleLongPress}
          style={{position: 'relative'}}>
          <View
            style={[
              styles.message,
              {
                maxWidth: '80%',
                marginLeft: isMe || showAvatar ? 0 : 40,
                marginRight: isMe ? 0 : 30,
                backgroundColor: item.media
                  ? item.media.type === 'call'
                    ? color.backgroundSecondary
                    : 'transparent'
                  : !isMe
                  ? color.backgroundSecondary
                  : !linkPreviews[index] && !item.media
                  ? '#00BFFF'
                  : color.backgroundSecondary,
                padding:
                  item.media?.type === 'image' || item.media?.type === 'call'
                    ? 0
                    : 10,
              },
            ]}>
            {renderContent()}
          </View>

          {item.reactions && item.reactions.length > 0 && (
            <View
              style={{
                position: 'absolute',
                bottom: -15,
                right: isMe ? 7 : undefined,
                left: !isMe ? 7 : undefined,
                marginLeft: !isMe ? (isMe || showAvatar ? 0 : 50) : 0,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                paddingHorizontal: 3,
                paddingVertical: 2,
                backgroundColor: '#fff',
                borderRadius: 20,
              }}>
              {displayedReactions.map((r, idx) => (
                <View key={idx} style={{marginRight: idx === 0 ? 0 : -8}}>
                  <Text style={{fontSize: 16}}>{r.content}</Text>
                </View>
              ))}
              {remainingCount > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    color: '#555',
                    marginRight: 6,
                  }}>{`+${remainingCount}`}</Text>
              )}
            </View>
          )}
        </Pressable>
      );
    }, [
      item,
      handleLongPress,
      isMe,
      showAvatar,
      color,
      linkPreviews,
      index,
      renderContent,
    ]);

    return (
      <View
        style={[
          styles.containerMessage,
          {
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            marginBottom: item.reactions && item.reactions.length > 0 ? 20 : 0,
            backgroundColor: isHighlighted ? '#fafaf0' : 'transparent',
            borderRadius: isHighlighted ? 8 : 0,
            paddingVertical: 4,
            marginHorizontal: isHighlighted ? 4 : 0,
            alignItems: 'flex-end',
          },
        ]}>
        {renderAvatar()}
        <View
          style={[styles.row, {alignItems: isMe ? 'flex-end' : 'flex-start'}]}>
          {renderMessageBubble()}
        </View>
      </View>
    );
  },
);

MessageItemComponent.displayName = 'MessageItemComponent';

export default MessageItemComponent;

const styles = StyleSheet.create({
  blockAvatar: {
    width: 30,
    height: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  message: {
    position: 'relative',
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  containerMessage: {
    width: '100%',
    flexDirection: 'row',
  },
  row: {
    width: '100%',
  },
});
