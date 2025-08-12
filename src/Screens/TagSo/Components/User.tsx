import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import {useTheme} from '../../../../src/util/ThemeContext';
import {Colors} from '../../../../assets/color/Colors';
import {Check, X} from 'lucide-react-native';

export interface UserProps {
  image: string;
  name: string;
  handle: string;
  isDelete?: boolean;
  func: () => void;
  isSelect?: boolean;
}

const User = (props: UserProps) => {
  const {theme} = useTheme();
  const colors = Colors[theme];
  const {image, name, handle, isDelete, func, isSelect=false} = props;
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 10,
      }}
      disabled={isDelete}
      onPress={() => {
        if (!isDelete) {
          func();
        }
      }}>
      <Image
        source={{uri: image}}
        style={{
          width: 50,
          height: 50,
          resizeMode: 'cover',
          borderRadius: 100,
          borderColor: colors.border,
          borderWidth: 0.5,
        }}
      />
      <View style={{flex: 1}}>
        <Text style={{fontSize: 14, fontWeight: '500', color: colors.text}}>
          {name}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: colors.textSecondary,
          }}>
          {handle}
        </Text>
      </View>
      {isDelete && (
        <TouchableOpacity onPress={func}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {isSelect && (
        <Check size={22} color={colors.primary}/>
      )}
    </TouchableOpacity>
  );
};

export default User;

const styles = StyleSheet.create({});
