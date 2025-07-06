import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../util/ThemeContext';
import {Colors} from '../../../../assets/color/Colors';

const HighlightStoriesSkeleton = () => {
  const {theme} = useTheme();
  const color = Colors[theme];

  return (
    <View style={styles.container}>
      <View style={styles.scrollContainer}>
        {/* Add button skeleton */}
        <View style={styles.highlightItem}>
          <View
            style={[
              styles.highlightImageContainer,
              {borderColor: color.border, backgroundColor: color.gray},
            ]}
          />
          <View style={[styles.titleSkeleton, {backgroundColor: color.gray}]} />
        </View>

        {/* Highlight items skeleton */}
        {Array.from({length: 5}).map((_, index) => (
          <View key={index} style={styles.highlightItem}>
            <View
              style={[
                styles.highlightImageContainer,
                {borderColor: color.border, backgroundColor: color.gray},
              ]}
            />
            <View
              style={[styles.titleSkeleton, {backgroundColor: color.gray}]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  highlightImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    padding: 2,
    marginBottom: 4,
  },
  titleSkeleton: {
    width: 40,
    height: 12,
    borderRadius: 6,
  },
});

export default HighlightStoriesSkeleton;
