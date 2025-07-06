import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {fetchStoryDetails} from '@services/StoryRedux/StorySlice';

interface UseHighlightStoryDetailsProps {
  highlights: any[];
  userId?: string;
}

interface StoryGroup {
  creator: {
    username: string;
    profilePic: string;
    _id: string;
  };
  stories: any[];
  highlightId: string;
  collectionName: string;
}

export const useHighlightStoryDetails = ({
  highlights,
  userId,
}: UseHighlightStoryDetailsProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>(
    {},
  );
  const [fetchedHighlights, setFetchedHighlights] = useState<Set<string>>(
    new Set(),
  );
  const user = useSelector((state: RootState) => state.user.user);
  const isInitialFetchDone = useRef(false);

  // Fetch story details cho một highlight cụ thể
  const fetchStoryDetailsForHighlight = useCallback(
    async (highlight: any) => {
      if (!highlight.storyId || highlight.storyId.length === 0) {
        return null;
      }

      try {
        setLoadingStates(prev => ({...prev, [highlight._id]: true}));

        const storyDetails = await dispatch(
          fetchStoryDetails({storyIds: highlight.storyId}),
        ).unwrap();

        if (storyDetails && storyDetails.length > 0) {
          const storiesWithMedia = storyDetails.map((story: any) => ({
            ...story,
            mediaUrl: story.mediaUrl,
            _id: story._id,
            createdAt: story.createdAt,
            content: story.content,
            music: story.music,
            tags: story.tags,
            viewedByUsers: story.viewedByUsers || [],
            likedByUsers: story.likedByUsers || [],
          }));

          const storyGroup: StoryGroup = {
            creator: {
              username: user?.handleName || '',
              profilePic: user?.profilePic || '',
              _id: user?._id || '',
            },
            stories: storiesWithMedia,
            highlightId: highlight._id,
            collectionName: highlight.collectionName,
          };

          setStoryGroups(prev => {
            const existing = prev.findIndex(
              g => g.highlightId === highlight._id,
            );
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = storyGroup;
              return updated;
            }
            return [...prev, storyGroup];
          });

          setFetchedHighlights(prev => new Set([...prev, highlight._id]));
        }
      } catch (error) {
        console.error(
          `❌ Error fetching story details for highlight ${highlight._id}:`,
          error,
        );
      } finally {
        setLoadingStates(prev => ({...prev, [highlight._id]: false}));
      }
    },
    [dispatch, user],
  );

  // Fetch initial batch (5 highlights đầu tiên)
  const fetchInitialBatch = useCallback(async () => {
    if (!highlights || highlights.length === 0 || isInitialFetchDone.current) {
      return;
    }

    const initialBatch = highlights.slice(0, 5);

    // Fetch ngầm cho 5 highlights đầu tiên
    initialBatch.forEach(highlight => {
      if (!fetchedHighlights.has(highlight._id)) {
        fetchStoryDetailsForHighlight(highlight);
      }
    });

    isInitialFetchDone.current = true;
  }, [highlights, fetchedHighlights, fetchStoryDetailsForHighlight]);

  // Fetch thêm khi user scroll đến highlight thứ 3
  const fetchMoreOnScroll = useCallback(
    (currentIndex: number) => {
      if (currentIndex >= 2 && highlights.length > currentIndex + 3) {
        const nextBatch = highlights.slice(currentIndex + 1, currentIndex + 4);

        nextBatch.forEach(highlight => {
          if (!fetchedHighlights.has(highlight._id)) {
            fetchStoryDetailsForHighlight(highlight);
          }
        });
      }
    },
    [highlights, fetchedHighlights, fetchStoryDetailsForHighlight],
  );

  // Fetch ngầm khi component mount
  useEffect(() => {
    if (highlights && highlights.length > 0 && userId) {
      fetchInitialBatch();
    }
  }, [highlights, userId, fetchInitialBatch]);

  // Reset khi highlights thay đổi
  useEffect(() => {
    if (highlights && highlights.length > 0) {
      setFetchedHighlights(new Set());
      setStoryGroups([]);
      isInitialFetchDone.current = false;
    }
  }, [highlights]);

  // Sử dụng useMemo để tạo ra story groups đã được sắp xếp theo thứ tự của highlights
  const orderedStoryGroups = useMemo(() => {
    if (highlights && highlights.length > 0 && storyGroups.length > 0) {
      return highlights
        .map(highlight =>
          storyGroups.find(group => group.highlightId === highlight._id),
        )
        .filter(Boolean) as StoryGroup[];
    }
    return storyGroups;
  }, [highlights, storyGroups]);

  return {
    storyGroups: orderedStoryGroups,
    loadingStates,
    fetchedHighlights,
    fetchStoryDetailsForHighlight,
    fetchMoreOnScroll,
  };
};
