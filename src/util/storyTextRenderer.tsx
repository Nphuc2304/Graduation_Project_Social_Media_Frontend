import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface MentionData {
  username?: string;
  handleName?: string; // backward compatibility
  _id: string;
}

export const renderTextWithMentions = (
  text: string,
  mentionData: MentionData[] = [],
  onMentionPress: (userId: string) => void,
  textStyle: any = {},
  mentionStyle: any = {}
) => {
  if (!text || typeof text !== 'string') {
    return <Text style={textStyle}></Text>;
  }

  // Ensure a consistent line height between normal text and mentions
  const baseFontSize = (textStyle && textStyle.fontSize) || 20;
  const baseTextStyle = {
    ...textStyle,
    lineHeight:
      (textStyle && textStyle.lineHeight) || Math.round(baseFontSize * 1.25),
  };

  const mentionRegex = /@([a-zA-Z0-9._]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={baseTextStyle}>
          {text.substring(lastIndex, match.index)}
        </Text>
      );
    }

    const mention = match[0]; // @username
    const mentionName = match[1]; // username without @

    // Find user data by username first, fallback to handleName
    const lower = mentionName.toLowerCase();
    const userData = mentionData.find(user => {
      const u = (user.username || '').toLowerCase();
      const h = (user.handleName || '').toLowerCase();
      return (u && u === lower) || (h && h === lower);
    });

    if (userData) {
      // Clickable mention using Text to keep typography identical
      parts.push(
        <Text
          key={key++}
          onPress={() => onMentionPress(userData._id)}
          style={[baseTextStyle, mentionStyle, { color: '#4A90E2' }]}
          suppressHighlighting
        >
          {mention}
        </Text>
      );
    } else {
      // Non-clickable mention (user not found)
      parts.push(
        <Text key={key++} style={[baseTextStyle, mentionStyle, { color: '#888' }]}>
          {mention}
        </Text>
      );
    }

    lastIndex = mentionRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={baseTextStyle}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return <Text style={baseTextStyle}>{parts}</Text>;
};

export const extractMentionsFromText = (text: string): string[] => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const regex = /@([a-zA-Z0-9._]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

// Function để combine content và tags thành text đầy đủ
export const combineContentWithTags = (
  content?: { text: string },
  tags?: Array<{ user: { username?: string; handleName?: string } }>
): string => {
  if (!content?.text && (!tags || tags.length === 0)) {
    return '';
  }

  let fullText = content?.text || '';
  
  // Thêm mentions từ tags vào cuối text
  if (tags && tags.length > 0) {
    const mentions = tags
      .map(tag => `@${tag.user.username || tag.user.handleName || ''}`.trim())
      .filter(Boolean)
      .join(' ');
    fullText = fullText ? `${fullText} ${mentions}` : mentions;
  }

  return fullText;
}; 