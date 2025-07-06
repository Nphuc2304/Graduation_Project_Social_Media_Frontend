import React, {useCallback} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {useTheme} from '../../../util/ThemeContext';
import {Colors} from '../../../../assets/color/Colors';
import {Story} from '../../../../services/StoryRedux/StoryType';
import {Plus} from 'lucide-react-native';

interface HighlightStoriesProps {
  highlights: Story[];
  onHighlightPress: (highlight: Story) => void;
  onAddHighlight: () => void;
  onScroll?: (index: number) => void;
  loadingStates?: {[key: string]: boolean};
  showAddButton?: boolean;
}

const HighlightStories: React.FC<HighlightStoriesProps> = ({
  highlights,
  onHighlightPress,
  onAddHighlight,
  onScroll,
  loadingStates = {},
  showAddButton = true,
}) => {
  const {theme} = useTheme();
  const color = Colors[theme];

  // Prepare data for FlashList
  const data = [
    ...(showAddButton ? [{id: 'new', type: 'add', title: 'Mới'}] : []),
    ...highlights.map((highlight, index) => ({
      id: highlight._id,
      type: 'highlight',
      highlight,
      title: highlight.collectionName || `Highlight ${index + 1}`,
    })),
  ];

  const renderItem = ({item}: {item: any}) => {
    if (item.type === 'add') {
      return (
        <TouchableOpacity style={styles.highlightItem} onPress={onAddHighlight}>
          <View
            style={[
              styles.highlightImageContainer,
              {borderColor: color.border},
            ]}>
            <View style={[styles.addButton, {backgroundColor: color.gray}]}>
              <Plus size={20} color={color.text} />
            </View>
          </View>
          <Text style={[styles.highlightTitle, {color: color.text}]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      );
    }

    const isLoading = loadingStates[item.highlight._id];

    return (
      <TouchableOpacity
        style={styles.highlightItem}
        onPress={() => onHighlightPress(item.highlight)}
        disabled={isLoading}>
        <View
          style={[styles.highlightImageContainer, {borderColor: color.border}]}>
          {isLoading ? (
            <View
              style={[styles.loadingContainer, {backgroundColor: color.gray}]}>
              <ActivityIndicator size="small" color={color.text} />
            </View>
          ) : (
            <Image
              source={{
                uri: item.highlight.thumbnail || item.highlight.mediaUrl,
              }}
              style={styles.highlightImage}
            />
          )}
        </View>
        <Text style={[styles.highlightTitle, {color: color.text}]}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleScroll = useCallback(
    (event: any) => {
      if (onScroll) {
        const {contentOffset, layoutMeasurement} = event.nativeEvent;
        const index = Math.floor(contentOffset.x / layoutMeasurement.width);
        onScroll(index);
      }
    },
    [onScroll],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={data}
        renderItem={renderItem}
        estimatedItemSize={80}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContainer: {
    paddingHorizontal: 16,
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
  highlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightTitle: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 64,
  },
});

export default HighlightStories;
