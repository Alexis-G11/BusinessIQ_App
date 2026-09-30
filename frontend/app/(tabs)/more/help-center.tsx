import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, HelpCircle, ChevronRight, ChevronDown } from 'lucide-react-native';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useFetch } from '@/lib/useFetch';
import * as helpApi from '@/api/help';
import type { HelpArticle } from '@/lib/types';

export default function HelpCenterScreen() {
  const router = useRouter();
  const articles = useFetch(() => helpApi.getHelpArticles(), []);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!articles.data) return [];
    const map = new Map<string, HelpArticle[]>();
    articles.data.forEach((a) => {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    });
    return Array.from(map.entries());
  }, [articles.data]);

  const filtered = useMemo(() => {
    if (!search) return null;
    return articles.data?.filter(
      (a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.content.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase()),
    );
  }, [articles.data, search]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Help Center</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          placeholderTextColor={Colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {articles.loading && !articles.data ? (
        <LoadingState />
      ) : articles.error ? (
        <ErrorState message={articles.error} onRetry={articles.refetch} />
      ) : filtered ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<HelpCircle size={48} color={Colors.neutral[300]} strokeWidth={1.5} />}
            title="No results found"
            message={`No articles match "${search}"`}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <HelpArticleCard article={item} expanded={expandedId === item.id} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)} />
            )}
          />
        )
      ) : (
        <FlatList
          data={categories}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={styles.list}
          renderItem={({ item: [category, items] }) => (
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {items.map((article) => (
                <HelpArticleCard
                  key={article.id}
                  article={article}
                  expanded={expandedId === article.id}
                  onPress={() => setExpandedId(expandedId === article.id ? null : article.id)}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

function HelpArticleCard({ article, expanded, onPress }: { article: HelpArticle; expanded: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card padding="md" style={styles.articleCard}>
        <View style={styles.articleHeader}>
          <Text style={styles.articleTitle}>{article.title}</Text>
          {expanded ? <ChevronDown size={18} color={Colors.neutral[400]} strokeWidth={2} /> : <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />}
        </View>
        {expanded && <Text style={styles.articleContent}>{article.content}</Text>}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.xl, color: Colors.neutral[900] },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[300], paddingHorizontal: Spacing.md, margin: Spacing.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.md, color: Colors.neutral[900], paddingVertical: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  categorySection: { marginBottom: Spacing.lg },
  categoryTitle: { fontFamily: Typography.fontFamilySemiBold, fontSize: Typography.sizes.md, color: Colors.neutral[900], marginBottom: Spacing.sm },
  articleCard: { marginBottom: Spacing.sm },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  articleTitle: { flex: 1, fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[900] },
  articleContent: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[600], lineHeight: Typography.sizes.sm * 1.5, marginTop: Spacing.sm },
});
