import {
  Dimensions,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {FlashList} from '@shopify/flash-list';
import {useTheme} from '../../util/ThemeContext';
import {SearchStyles} from '../../StyleSheet/SearchStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HistoryItem from './Components/HistoryItem';
import {Colors} from '../../../assets/color/Colors';
import SearchResult from './Components/SearchResult';
import {RootState} from '../../../services/store';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch} from '../../../services/store';
import ExploreSection, {ExploreMedia} from './Components/ExploreTile';
import {useDebounce} from 'use-debounce';
import {
  fetchSearchPost,
  fetchSearchUser,
  clearSearchResults,
} from '../../../services/searchRedux/searchSlice';
import {
  selectSearchLoading,
  User as userType,
  UserR,
} from '../../../services/searchRedux/searchType';
import User from './Components/User';
import {clearPosts, clearReels} from '@services/searchRedux/searchReducer';
import {fetchMedia} from '@services/SearchPost/searchPostReducer';
import {SkeletonExploreSection} from '../../../components/SkeletonGrid';
import {ArrowLeft, Search as SearchIcon} from 'lucide-react-native';

const SEARCH_HISTORY_KEY = 'search_history';

export interface SearchRef {
  resetToInitial: () => void;
}

export const Search = forwardRef<SearchRef, {}>((props, ref) => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state selectors
  const postsData = useSelector((state: RootState) => state.searchPost.items);
  const {pagination, isLoading: loading} = useSelector(
    (state: RootState) => state.searchPost,
  );
  const {refreshToken} = useSelector((state: RootState) => state.user);
  const {users, isError} = useSelector((state: RootState) => state.search);
  const isLoading = useSelector(selectSearchLoading);

  // Theme and styles
  const theme = useTheme();
  const color = Colors[theme.theme];
  const styles = SearchStyles(theme.theme);

  // Local state
  const [isFocused, setIsFocused] = useState(false);
  const [isShowResult, setIsShowResult] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [visibleIndexView2, setVisibleIndexView2] = useState<number | null>(
    null,
  );

  // Refs
  const inputRef = useRef<TextInput>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearch = useRef('');

  // Debounced search
  const [debouncedSearchText] = useDebounce(searchText, 500);

  // Screen dimensions
  const screenDimensions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const SMALL = (screenWidth - 6) / 3;
    const BIG = SMALL * 2 + 2;
    return {SMALL, BIG};
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(clearSearchResults());
    setSearchText('');
    setIsShowResult(false);
    setIsFocused(false);
  }, [dispatch]);

  // Reset to initial state function
  const resetToInitial = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(clearSearchResults());
    dispatch(clearPosts());
    dispatch(clearReels());
    setSearchText('');
    setIsShowResult(false);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [dispatch]);

  // Expose resetToInitial to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      resetToInitial,
    }),
    [resetToInitial],
  );

  // Search effect
  useEffect(() => {
    const keyword = debouncedSearchText.trim();
    if (keyword && keyword !== lastSearch.current) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      lastSearch.current = keyword;
      dispatch(fetchSearchUser({refreshToken, keyword, mode: 'username'}));
      dispatch(fetchSearchPost({refreshToken, keyword}));
    }
    if (!keyword) {
      lastSearch.current = '';
      dispatch(clearSearchResults());
      dispatch(clearPosts());
      dispatch(clearReels());
    }
  }, [debouncedSearchText, dispatch, refreshToken]);

  // History management
  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw) setSearchHistory(JSON.parse(raw));
  }, []);

  const saveHistory = useCallback(async (q: string) => {
    if (!q) return;
    setSearchHistory(prev => {
      const updated = [q, ...prev.filter(x => x !== q)].slice(0, 10);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteHistory = useCallback(async (q: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(x => x !== q);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Combined search results
  const combinedResults = useMemo(() => {
    const keyword = debouncedSearchText.trim().toLowerCase();
    if (keyword && !isLoading && !isError) {
      const hist = searchHistory
        .filter(item => item.toLowerCase().includes(keyword))
        .slice(0, 2);
      const userItems = (users as UserR)?.items || [];
      return [
        ...hist.map((h, i) => ({
          type: 'history',
          value: h,
          id: `history-${i}`,
        })),
        ...userItems.map((u: userType, i: number) => ({
          type: 'user',
          value: u,
          id: `user-${u._id || i}`,
        })),
      ];
    }
    return searchHistory.map((h, i) => ({
      type: 'history',
      value: h,
      id: `history-${i}`,
    }));
  }, [debouncedSearchText, searchHistory, users, isLoading, isError]);

  // Media groups for explore
  const mediaGroups = useMemo(() => {
    const groups: ExploreMedia[][] = [];
    for (let i = 0; i < postsData.length; i += 5) {
      const group = postsData
        .slice(i, i + 5)
        .filter(post => post.media && post.media.length > 0)
        .map(post => ({_id: post._id, media: post.media}));
      if (group.length === 5) groups.push(group);
    }
    return groups;
  }, [postsData]);

  // Event handlers
  const handleSearchSubmit = useCallback(() => {
    if (!searchText.trim()) return;
    saveHistory(searchText);
    setIsFocused(false);
    setIsShowResult(true);
    inputRef.current?.blur();
  }, [searchText, saveHistory]);

  const handleCancel = useCallback(() => {
    inputRef.current?.blur();
    setIsFocused(false);
    setSearchText('');
  }, []);

  const handleBack = useCallback(() => {
    setIsShowResult(false);
    setSearchText('');
  }, []);

  const loadMore = useCallback(() => {
    if (pagination && pagination.hasNextPage && !loading) {
      dispatch(fetchMedia({page: pagination.currentPage + 1}));
    }
  }, [pagination, loading, dispatch]);

  // Render functions
  const renderSearchItem = useCallback(
    ({item}: any) => {
      if (item.type === 'history') {
        return (
          <HistoryItem
            name={item.value}
            onPress={() => {
              setSearchText(item.value);
              saveHistory(item.value);
              setIsFocused(false);
              setIsShowResult(true);
              inputRef.current?.blur();
            }}
            onDelete={() => deleteHistory(item.value)}
          />
        );
      }
      return (
        <User
          id={item.value._id}
          name={item.value.username}
          image={item.value.profilePic}
          handle={item.value.handleName}
        />
      );
    },
    [deleteHistory, saveHistory],
  );

  const renderExploreItem = useCallback(
    ({item, index}: any) => {
      return <ExploreSection media={item} index={index} data={postsData} />;
    },
    [postsData],
  );

  const renderFooter = () => {
    if (pagination?.hasNextPage && loading) {
      return (
        <View>
          <SkeletonExploreSection />
        </View>
      );
    }
    return null;
  };

  const onViewableItemsChangedView2 = useCallback(({viewableItems}: any) => {
    const idx = viewableItems[0]?.index ?? null;
    setVisibleIndexView2(prev => (prev !== idx ? idx : prev));
  }, []);

  const viewabilityConfig = useMemo(
    () => ({viewAreaCoveragePercentThreshold: 50}),
    [],
  );

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    dispatch(fetchMedia({page: 1}));
  }, [dispatch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (postsData.length > 0 && isInitializing) {
      setIsInitializing(false);
    }
  }, [postsData, isInitializing]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {isShowResult && (
          <TouchableOpacity onPress={handleBack} style={{marginRight: 10}}>
            <ArrowLeft size={22} color={color.text} />
          </TouchableOpacity>
        )}
        <View style={styles.row}>
          <View style={styles.searchInputContainer}>
            <SearchIcon size={15} color={color.text} />
            <TextInput
              ref={inputRef}
              placeholder="Tìm kiếm..."
              placeholderTextColor={color.text}
              onFocus={() => {
                setIsFocused(true);
                setIsShowResult(false);
              }}
              style={{
                color: color.text,
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 8,
              }}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
          </View>
        </View>
        {isFocused && (
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.textHuy}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {/* Search History & Suggestions */}
        {isFocused && !isShowResult && (
          <View
            style={[
              styles.container,
              {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0},
            ]}>
            {searchText === '' && searchHistory.length > 0 && (
              <View style={styles.rowSpace}>
                <Text style={styles.textGD}>Gần đây</Text>
                <Text style={styles.textAll}>Xem tất cả</Text>
              </View>
            )}
            {searchText !== '' && (
              <HistoryItem
                name={searchText}
                onPress={handleSearchSubmit}
                onDelete={() => {}}
              />
            )}
            <FlashList
              data={combinedResults}
              renderItem={renderSearchItem}
              estimatedItemSize={60}
              showsVerticalScrollIndicator={false}
              keyExtractor={item => item.id}
              removeClippedSubviews
            />
          </View>
        )}

        {/* Search Results */}
        {isShowResult && (
          <View
            style={[
              styles.container,
              {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0},
            ]}>
            <SearchResult
              searchText={debouncedSearchText}
              currentVisibleIndex={visibleIndexView2}
              onViewableItemsChanged={onViewableItemsChangedView2}
              isPause={isShowResult}
            />
          </View>
        )}

        {/* Explore Media Grid - Show skeleton when initializing */}
        {!isFocused && !isShowResult && (
          <View style={styles.container}>
            {isInitializing ? (
              <SkeletonExploreSection />
            ) : (
              <FlashList
                data={mediaGroups}
                keyExtractor={(_, i) => `media-group-${i}`}
                renderItem={renderExploreItem}
                estimatedItemSize={screenDimensions.BIG + 4}
                viewabilityConfig={viewabilityConfig}
                removeClippedSubviews
                onEndReached={loadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                getItemType={() => 'media-group'}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
});

Search.displayName = 'Search';
