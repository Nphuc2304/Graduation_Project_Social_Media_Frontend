import React, {useEffect, useState} from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import {styles} from './styles';
import {Pause, Play, VolumeX, Volume2, X} from 'lucide-react-native';

export const Header = ({
  onClose,
  username,
  profilePic,
  pause,
  onTogglePause,
  mute,
  onToggleMute,
  createdAt,
}: {
  onClose: () => void;
  username?: string;
  profilePic?: string;
  pause: boolean;
  onTogglePause: () => void;
  mute: boolean;
  onToggleMute: () => void;
  createdAt?: string;
}) => {
  const [timeAgo, setTimeAgo] = useState('');
  useEffect(() => {
    if (!createdAt) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const created = new Date(createdAt);
      const diffMs = now.getTime() - created.getTime();

      if (diffMs < 0 || diffMs >= 24 * 60 * 60 * 1000) {
        setTimeAgo('');
        return;
      }

      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setTimeAgo(`${hours} giờ trước`);
      } else if (minutes > 0) {
        setTimeAgo(`${minutes} phút trước`);
      } else if (seconds > 0) {
        setTimeAgo(`${seconds} giây trước`);
      } else {
        setTimeAgo('Vừa xong');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return (
    <View style={styles.header}>
      <View style={styles.viewUser}>
        <TouchableOpacity>
          <Image
            style={styles.avatar}
            source={{
              uri: profilePic,
            }}
          />
        </TouchableOpacity>
        <Text style={styles.nameUser}>{username}</Text>
        {timeAgo ? <Text style={styles.textTime}>{timeAgo}</Text> : null}
      </View>

      <TouchableOpacity style={styles.mute} onPress={onToggleMute}>
        {mute ? (
          <VolumeX size={24} color="#fff" />
        ) : (
          <Volume2 size={24} color="#fff" />
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.pause} onPress={onTogglePause}>
        {pause ? (
          <Play size={24} color="#fff" />
        ) : (
          <Pause size={24} color="#fff" />
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnCloser} onPress={onClose}>
        <X color={'#fff'} />
      </TouchableOpacity>
    </View>
  );
};
