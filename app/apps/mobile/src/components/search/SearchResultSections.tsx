import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@kc/ui';
import type { SearchResultType } from '@kc/domain';
import type { UniversalSearchResults } from '@kc/application';
import {
  UserResultCard,
  PostResultCard,
  LinkResultCard,
} from '../SearchResultCard';
import { useSearchScreenStyles } from '../../../app/(tabs)/search.styles';
import { SearchSocialSections } from './SearchSocialSections';

type Props = {
  results: UniversalSearchResults;
  expandedSection: SearchResultType | null;
  onExpand: (section: SearchResultType) => void;
  previewLimit: number;
  showNationalLinksNote: boolean;
  onHashtagTap: (tag: string) => void;
};

export function SearchResultSections({
  results,
  expandedSection,
  onExpand,
  previewLimit,
  showNationalLinksNote,
  onHashtagTap,
}: Props) {
  const styles = useSearchScreenStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      {results.users.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('search.sectionPeople')}</Text>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.sectionCount}>({results.usersTotal})</Text>
            </View>
            {results.usersTotal > previewLimit && expandedSection !== 'user' && (
              <TouchableOpacity style={styles.showAllBtn} onPress={() => onExpand('user')}>
                <Text style={styles.showAllText}>{t('search.showAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {results.users.map((user) => (
            <UserResultCard key={user.userId} user={user} />
          ))}
        </View>
      )}

      {results.posts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('search.sectionPosts')}</Text>
              <Ionicons name="cube" size={18} color={colors.primary} />
              <Text style={styles.sectionCount}>({results.postsTotal})</Text>
            </View>
            {results.postsTotal > previewLimit && expandedSection !== 'post' && (
              <TouchableOpacity style={styles.showAllBtn} onPress={() => onExpand('post')}>
                <Text style={styles.showAllText}>{t('search.showAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {results.posts.map((post) => (
            <PostResultCard key={post.postId} post={post} />
          ))}
        </View>
      )}

      <SearchSocialSections results={results} onHashtagTap={onHashtagTap} />

      {results.links.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('search.sectionLinks')}</Text>
              <Ionicons name="link" size={18} color={colors.secondary} />
              <Text style={styles.sectionCount}>({results.linksTotal})</Text>
            </View>
            {results.linksTotal > previewLimit && expandedSection !== 'link' && (
              <TouchableOpacity style={styles.showAllBtn} onPress={() => onExpand('link')}>
                <Text style={styles.showAllText}>{t('search.showAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {showNationalLinksNote && (
            <View style={styles.nationalNote}>
              <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.nationalNoteText}>{t('search.nationalLinks')}</Text>
            </View>
          )}
          {results.links.map((link) => (
            <LinkResultCard key={link.id} link={link} />
          ))}
        </View>
      )}
    </>
  );
}
