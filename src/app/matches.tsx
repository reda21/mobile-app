import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ArabicText, EmptyState, Frame, Header, Icon, fonts, ui } from '../components/news-ui';
import { StandingsTable } from '../components/standings-table';
import { StatsView } from '../components/stats-view';
import { CalendarView } from '../components/calendar-view';
import { usePreferences } from '../lib/preferences';
import { useNetworkStatus } from '../lib/network';
import { formatCount } from '../lib/format';
import {
  getMatches,
  formatMatchStatus,
  formatMatchTime,
  isMatchToday,
  type Match,
  type MatchesResult,
} from '../lib/matches';

type FilterTab = 'all' | 'live' | 'today' | 'upcoming' | 'finished';

interface CompetitionGroup {
  competitionKey: string;
  competitionName: string;
  competitionEmblem: string;
  matches: Match[];
}

export default function MatchesScreen() {
  const { colors } = usePreferences();
  const { isOffline } = useNetworkStatus();
  const [data, setData] = useState<MatchesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'fixtures' | 'calendar' | 'standings' | 'stats'>('fixtures');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    getMatches({ forceReload: reload > 0, signal: controller.signal })
      .then(res => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
          setRefreshing(false);
        }
      })
      .catch(err => {
        if (active && !controller.signal.aborted) {
          setError(err?.message || 'تعذر تحميل بيانات المباريات. تحقق من اتصالك وحاول مرة أخرى.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReload(r => r + 1);
  }, []);

  const allMatches = useMemo(() => data?.matches ?? [], [data?.matches]);

  // Compter les matchs en direct
  const liveCount = useMemo(() => {
    return allMatches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  }, [allMatches]);

  // Liste des compétitions uniques pour le filtre horizontal
  const competitionsList = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    allMatches.forEach(m => {
      const code = m.competition.code || m.competition.name;
      if (code && !map.has(code)) {
        map.set(code, { code, name: m.competition.nameAr || m.competition.name });
      }
    });
    return Array.from(map.values());
  }, [allMatches]);

  // Filtrage des matchs
  const filteredMatches = useMemo(() => {
    let list = allMatches;

    // Filtre par statut / période
    if (activeTab === 'live') {
      list = list.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
    } else if (activeTab === 'today') {
      list = list.filter(m => isMatchToday(m.utcDate));
    } else if (activeTab === 'upcoming') {
      list = list.filter(m => m.status === 'TIMED' || m.status === 'SCHEDULED');
    } else if (activeTab === 'finished') {
      list = list.filter(m => m.status === 'FINISHED' || m.status === 'AWARDED');
    }

    // Filtre par compétition
    if (selectedCompetition !== 'all') {
      list = list.filter(
        m => m.competition.code === selectedCompetition || m.competition.name === selectedCompetition,
      );
    }

    // Filtre par recherche
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(m => {
        const home = `${m.homeTeam.nameAr} ${m.homeTeam.name} ${m.homeTeam.shortName}`.toLowerCase();
        const away = `${m.awayTeam.nameAr} ${m.awayTeam.name} ${m.awayTeam.shortName}`.toLowerCase();
        const comp = `${m.competition.nameAr} ${m.competition.name}`.toLowerCase();
        return home.includes(q) || away.includes(q) || comp.includes(q);
      });
    }

    return list;
  }, [allMatches, activeTab, selectedCompetition, searchQuery]);

  // Regroupement par compétition pour une organisation claire
  const competitionGroups = useMemo<CompetitionGroup[]>(() => {
    const map = new Map<string, CompetitionGroup>();
    filteredMatches.forEach(match => {
      const key = match.competition.code || match.competition.name || 'other';
      if (!map.has(key)) {
        map.set(key, {
          competitionKey: key,
          competitionName: match.competition.nameAr || match.competition.name,
          competitionEmblem: match.competition.emblem,
          matches: [],
        });
      }
      map.get(key)!.matches.push(match);
    });
    return Array.from(map.values());
  }, [filteredMatches]);

  const renderGroup = useCallback(
    ({ item }: { item: CompetitionGroup }) => {
      return (
        <View style={styles.groupContainer}>
          {/* En-tête de la compétition */}
          <View style={[styles.competitionHeader, ui.row, { backgroundColor: colors.soft }]}>
            {item.competitionEmblem ? (
              <Image
                source={{ uri: item.competitionEmblem }}
                style={styles.competitionEmblem}
                contentFit="contain"
              />
            ) : null}
            <ArabicText style={[styles.competitionTitle, { color: colors.ink }]}>
              {item.competitionName}
            </ArabicText>
            <View style={{ flex: 1 }} />
            <ArabicText style={[styles.groupCount, { color: colors.muted }]}>
              {formatCount(item.matches.length)} مباراة
            </ArabicText>
          </View>

          {/* Cartes de matchs */}
          <View style={styles.matchesList}>
            {item.matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        </View>
      );
    },
    [colors],
  );

  return (
    <Frame bottom="matches">
      <Header />

      {/* Bascule principale : المباريات / الترتيب */}
      <View style={[styles.mainSwitchRow, ui.row, { borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="المباريات والنتائج"
          accessibilityState={{ selected: currentTab === 'fixtures' }}
          onPress={() => setCurrentTab('fixtures')}
          style={[
            styles.mainSwitchBtn,
            currentTab === 'fixtures' && { borderBottomColor: colors.green, borderBottomWidth: 3 },
          ]}
        >
          <ArabicText
            style={[
              styles.mainSwitchText,
              {
                color: currentTab === 'fixtures' ? colors.green : colors.muted,
                fontFamily: currentTab === 'fixtures' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            المباريات
          </ArabicText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رزنامة المباريات والتقويم"
          accessibilityState={{ selected: currentTab === 'calendar' }}
          onPress={() => setCurrentTab('calendar')}
          style={[
            styles.mainSwitchBtn,
            currentTab === 'calendar' && { borderBottomColor: colors.green, borderBottomWidth: 3 },
          ]}
        >
          <ArabicText
            style={[
              styles.mainSwitchText,
              {
                color: currentTab === 'calendar' ? colors.green : colors.muted,
                fontFamily: currentTab === 'calendar' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            الروزنامة
          </ArabicText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="جدول الترتيب"
          accessibilityState={{ selected: currentTab === 'standings' }}
          onPress={() => setCurrentTab('standings')}
          style={[
            styles.mainSwitchBtn,
            currentTab === 'standings' && { borderBottomColor: colors.green, borderBottomWidth: 3 },
          ]}
        >
          <ArabicText
            style={[
              styles.mainSwitchText,
              {
                color: currentTab === 'standings' ? colors.green : colors.muted,
                fontFamily: currentTab === 'standings' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            جدول الترتيب
          </ArabicText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الإحصائيات والهدافون"
          accessibilityState={{ selected: currentTab === 'stats' }}
          onPress={() => setCurrentTab('stats')}
          style={[
            styles.mainSwitchBtn,
            currentTab === 'stats' && { borderBottomColor: colors.green, borderBottomWidth: 3 },
          ]}
        >
          <ArabicText
            style={[
              styles.mainSwitchText,
              {
                color: currentTab === 'stats' ? colors.green : colors.muted,
                fontFamily: currentTab === 'stats' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            الإحصائيات
          </ArabicText>
        </Pressable>
      </View>

      {currentTab === 'calendar' ? (
        <CalendarView />
      ) : currentTab === 'standings' ? (
        <StandingsTable />
      ) : currentTab === 'stats' ? (
        <StatsView />
      ) : (
        <>
          {/* Bannière Hors-ligne / Cache */}
      {isOffline && (
        <View style={[styles.banner, ui.row, { backgroundColor: '#78350F' }]}>
          <ArabicText style={styles.bannerText}>
            📡 وضع عدم الاتصال — يتم عرض المباريات المحفوظة مسبقًا
          </ArabicText>
        </View>
      )}

      {data?.rateLimited && (
        <View style={[styles.banner, ui.row, { backgroundColor: '#92400E' }]}>
          <ArabicText style={styles.bannerText}>
            ⏳ تم الوصول لحد الطلبات المجاني، تُعرض أحدث نسخة مخزنة
          </ArabicText>
        </View>
      )}

      {/* Barre de recherche */}
      <View style={[styles.searchBar, ui.row, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="ابحث عن مباراة أو فريق أو دوري"
          placeholder="ابحث عن فريق، نادي أو بطولة..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.ink }]}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="مسح البحث"
            onPress={() => setSearchQuery('')}
            hitSlop={8}
          >
            <Icon name="trash" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Onglets Filtres (الكل / مباشر / اليوم / القادمة / المنتهية) */}
      <View style={[styles.tabsRow, ui.row, { borderBottomColor: colors.line }]}>
        <FilterTabButton
          label="الكل"
          active={activeTab === 'all'}
          onPress={() => setActiveTab('all')}
        />
        <FilterTabButton
          label={liveCount > 0 ? `مباشر (${liveCount}) 🔴` : 'مباشر'}
          active={activeTab === 'live'}
          onPress={() => setActiveTab('live')}
          highlight={liveCount > 0}
        />
        <FilterTabButton
          label="اليوم"
          active={activeTab === 'today'}
          onPress={() => setActiveTab('today')}
        />
        <FilterTabButton
          label="القادمة"
          active={activeTab === 'upcoming'}
          onPress={() => setActiveTab('upcoming')}
        />
        <FilterTabButton
          label="المنتهية"
          active={activeTab === 'finished'}
          onPress={() => setActiveTab('finished')}
        />
      </View>

      {/* Filtre horizontal par compétition */}
      {competitionsList.length > 1 && (
        <View style={[styles.chipsWrapper, { borderBottomColor: colors.line }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="كل البطولات"
              onPress={() => setSelectedCompetition('all')}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCompetition === 'all' ? colors.green : colors.surface,
                  borderColor: selectedCompetition === 'all' ? colors.green : colors.line,
                },
              ]}
            >
              <ArabicText
                style={[
                  styles.chipText,
                  { color: selectedCompetition === 'all' ? colors.paper : colors.ink },
                ]}
              >
                كل البطولات
              </ArabicText>
            </Pressable>

            {competitionsList.map(comp => {
              const selected = selectedCompetition === comp.code;
              return (
                <Pressable
                  key={comp.code}
                  accessibilityRole="button"
                  accessibilityLabel={comp.name}
                  onPress={() => setSelectedCompetition(comp.code)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.green : colors.surface,
                      borderColor: selected ? colors.green : colors.line,
                    },
                  ]}
                >
                  <ArabicText
                    style={[
                      styles.chipText,
                      { color: selected ? colors.paper : colors.ink },
                    ]}
                  >
                    {comp.name}
                  </ArabicText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Liste des matchs */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <ArabicText style={[styles.loadingText, { color: colors.muted }]}>
            جارٍ جلب جدول المباريات والنتائج المباشرة...
          </ArabicText>
        </View>
      ) : error && allMatches.length === 0 ? (
        <EmptyState
          title="تعذر تحميل المباريات"
          message={error}
          retry={handleRefresh}
        />
      ) : filteredMatches.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'live'
              ? 'لا توجد مباريات جارية الآن'
              : searchQuery
              ? 'لم يتم العثور على نتائج للبحث'
              : 'لا توجد مباريات في هذه الفترة'
          }
          message={
            activeTab === 'live'
              ? 'تابع جدول المباريات القادمة للاطلاع على المواعيد.'
              : 'جرّب تغيير خيارات التصفية أو البحث.'
          }
          retry={handleRefresh}
        />
      ) : (
        <FlashList
          data={competitionGroups}
          keyExtractor={item => item.competitionKey}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          }
        />
      )}
        </>
      )}
    </Frame>
  );
}

function FilterTabButton({
  label,
  active,
  onPress,
  highlight = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  highlight?: boolean;
}) {
  const { colors } = usePreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.tabButton,
        active && { borderBottomColor: highlight ? '#DC2626' : colors.green, borderBottomWidth: 2.5 },
      ]}
    >
      <ArabicText
        style={[
          styles.tabText,
          {
            color: active
              ? highlight
                ? '#DC2626'
                : colors.green
              : highlight
              ? '#DC2626'
              : colors.muted,
            fontFamily: active ? fonts.bold : fonts.medium,
          },
        ]}
      >
        {label}
      </ArabicText>
    </Pressable>
  );
}

function MatchCard({ match }: { match: Match }) {
  const { colors } = usePreferences();
  const statusInfo = formatMatchStatus(match.status, match.utcDate);

  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  const isFinished = statusInfo.isFinished;
  const isLive = statusInfo.isLive;

  const homeWon = isFinished && match.score.winner === 'HOME_TEAM';
  const awayWon = isFinished && match.score.winner === 'AWAY_TEAM';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Ligne d'état / Matchday */}
      <View style={[styles.cardTopRow, ui.row]}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.badgeBg },
          ]}
        >
          {isLive && <View style={styles.livePulseDot} />}
          <ArabicText style={[styles.statusBadgeText, { color: statusInfo.badgeTextColor }]}>
            {statusInfo.label}
          </ArabicText>
        </View>

        {match.matchday ? (
          <ArabicText style={[styles.matchdayText, { color: colors.muted }]}>
            الجولة {formatCount(match.matchday)}
          </ArabicText>
        ) : (
          <ArabicText style={[styles.matchdayText, { color: colors.muted }]}>
            {formatMatchTime(match.utcDate)}
          </ArabicText>
        )}
      </View>

      {/* Corps du Match : Équipe Domicile vs Équipe Extérieure */}
      <View style={[styles.teamsRow, ui.row]}>
        {/* Équipe Domicile */}
        <View style={styles.teamColumn}>
          {match.homeTeam.crest ? (
            <Image
              source={{ uri: match.homeTeam.crest }}
              style={styles.teamCrest}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.teamCrestPlaceholder, { backgroundColor: colors.soft }]} />
          )}
          <ArabicText
            numberOfLines={2}
            style={[
              styles.teamName,
              { color: colors.ink },
              homeWon && { fontFamily: fonts.bold, color: colors.green },
            ]}
          >
            {match.homeTeam.nameAr}
          </ArabicText>
        </View>

        {/* Score ou Heure au Centre */}
        <View style={styles.scoreContainer}>
          {isFinished || isLive ? (
            <View style={styles.scoreBox}>
              <View style={[styles.scoreRow, ui.row]}>
                <ArabicText
                  style={[
                    styles.scoreNumber,
                    { color: homeWon ? colors.green : colors.ink },
                  ]}
                >
                  {homeScore !== null ? formatCount(homeScore) : '-'}
                </ArabicText>
                <ArabicText style={[styles.scoreSeparator, { color: colors.muted }]}>
                  :
                </ArabicText>
                <ArabicText
                  style={[
                    styles.scoreNumber,
                    { color: awayWon ? colors.green : colors.ink },
                  ]}
                >
                  {awayScore !== null ? formatCount(awayScore) : '-'}
                </ArabicText>
              </View>
              {match.score.halfTime.home !== null && match.score.halfTime.away !== null && (
                <ArabicText style={[styles.halfTimeScore, { color: colors.muted }]}>
                  (الشوط الأول: {formatCount(match.score.halfTime.home)} - {formatCount(match.score.halfTime.away)})
                </ArabicText>
              )}
            </View>
          ) : (
            <View style={styles.upcomingTimeBox}>
              <ArabicText style={[styles.timeText, { color: colors.green }]}>
                {formatMatchTime(match.utcDate)}
              </ArabicText>
              <ArabicText style={[styles.vsText, { color: colors.muted }]}>ضد</ArabicText>
            </View>
          )}
        </View>

        {/* Équipe Extérieure */}
        <View style={styles.teamColumn}>
          {match.awayTeam.crest ? (
            <Image
              source={{ uri: match.awayTeam.crest }}
              style={styles.teamCrest}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.teamCrestPlaceholder, { backgroundColor: colors.soft }]} />
          )}
          <ArabicText
            numberOfLines={2}
            style={[
              styles.teamName,
              { color: colors.ink },
              awayWon && { fontFamily: fonts.bold, color: colors.green },
            ]}
          >
            {match.awayTeam.nameAr}
          </ArabicText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    writingDirection: 'rtl',
    textAlign: 'right',
    padding: 0,
  },
  tabsRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
  },
  chipsWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  centerContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: fonts.medium,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  groupContainer: {
    marginBottom: 20,
  },
  competitionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    gap: 8,
  },
  competitionEmblem: {
    width: 20,
    height: 20,
  },
  competitionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  groupCount: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  matchesList: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  matchdayText: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  teamsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamCrest: {
    width: 38,
    height: 38,
  },
  teamCrestPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  teamName: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  scoreContainer: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreRow: {
    gap: 8,
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 20,
    fontFamily: fonts.heading,
  },
  scoreSeparator: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  halfTimeScore: {
    fontSize: 9,
    marginTop: 2,
  },
  upcomingTimeBox: {
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  vsText: {
    fontSize: 10,
  },
  mainSwitchRow: {
    borderBottomWidth: 1,
  },
  mainSwitchBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  mainSwitchText: {
    fontSize: 14,
  },
});
