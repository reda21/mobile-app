import { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ArabicText, EmptyState, Icon, fonts, ui } from './news-ui';
import { usePreferences } from '../lib/preferences';
import { useNetworkStatus } from '../lib/network';
import { AVAILABLE_STANDINGS_COMPETITIONS, type StandingsCompetitionCode } from '../lib/standings';
import {
  getCompetitionStats,
  type CompetitionStatsResult,
  type ScorerItem,
  type TeamStatItem,
} from '../lib/stats';

export const StatsView = memo(function StatsView() {
  const { colors } = usePreferences();
  const { isOffline } = useNetworkStatus();
  const [selectedComp, setSelectedComp] = useState<StandingsCompetitionCode>('PD');
  const [data, setData] = useState<CompetitionStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const handleSelectComp = useCallback((code: StandingsCompetitionCode) => {
    setSelectedComp(code);
    setLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    getCompetitionStats(selectedComp, {
      forceReload: reload > 0,
      signal: controller.signal,
    })
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
          setError(err?.message || 'تعذر تحميل الإحصائيات. تحقق من اتصالك وحاول مجددًا.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedComp, reload]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReload(r => r + 1);
  }, []);

  return (
    <View style={styles.container}>
      {/* Sélecteur de compétition */}
      <View style={[styles.chipsWrapper, { borderBottomColor: colors.line }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {AVAILABLE_STANDINGS_COMPETITIONS.map(comp => {
            const isSelected = selectedComp === comp.code;
            return (
              <Pressable
                key={comp.code}
                accessibilityRole="button"
                accessibilityLabel={comp.nameAr}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectComp(comp.code)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.green : colors.surface,
                    borderColor: isSelected ? colors.green : colors.line,
                  },
                ]}
              >
                <ArabicText
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.paper : colors.ink },
                  ]}
                >
                  {comp.nameAr}
                </ArabicText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Bannière Hors-ligne / Quota */}
      {isOffline && (
        <View style={[styles.banner, ui.row, { backgroundColor: '#78350F' }]}>
          <ArabicText style={styles.bannerText}>
            📡 وضع عدم الاتصال — يتم عرض الإحصائيات المحفوظة محليًا
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

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.green} />
          <ArabicText style={[styles.loadingText, { color: colors.muted }]}>
            جارٍ تحميل الإحصائيات وقائمة الهدافين...
          </ArabicText>
        </View>
      ) : error && !data ? (
        <EmptyState
          title="تعذر تحميل الإحصائيات"
          message={error}
          retry={handleRefresh}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          }
        >
          {/* Cartes KPI : Résumé de la saison */}
          <View style={[styles.kpiRow, ui.row]}>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <ArabicText style={[styles.kpiValue, { color: colors.green }]}>
                {data?.totalGoals ?? 0}
              </ArabicText>
              <ArabicText style={[styles.kpiLabel, { color: colors.muted }]}>
                إجمالي الأهداف
              </ArabicText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <ArabicText style={[styles.kpiValue, { color: colors.gold }]}>
                {data?.goalsPerMatch ?? '0.0'}
              </ArabicText>
              <ArabicText style={[styles.kpiLabel, { color: colors.muted }]}>
                معدل أهداف/مباراة
              </ArabicText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <ArabicText style={[styles.kpiValue, { color: colors.ink }]}>
                {data?.totalMatchesPlayed ?? 0}
              </ArabicText>
              <ArabicText style={[styles.kpiLabel, { color: colors.muted }]}>
                المباريات الملعوبة
              </ArabicText>
            </View>
          </View>

          {/* Section 1 : قائمة الهدافين */}
          <View style={styles.sectionHeader}>
            <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>
              ⚽ قائمة الهدافين
            </ArabicText>
          </View>

          <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {/* Header */}
            <View style={[styles.tableHeaderRow, ui.row, { borderBottomColor: colors.line }]}>
              <ArabicText style={[styles.colRank, styles.headerLabel, { color: colors.muted }]}>#</ArabicText>
              <ArabicText style={[styles.colPlayer, styles.headerLabel, { color: colors.muted }]}>اللاعب والفريق</ArabicText>
              <ArabicText style={[styles.colSmall, styles.headerLabel, { color: colors.muted }]}>لعب</ArabicText>
              <ArabicText style={[styles.colSmall, styles.headerLabel, { color: colors.muted }]}>صنع</ArabicText>
              <ArabicText style={[styles.colGoals, styles.headerLabel, { color: colors.green }]}>الأهداف</ArabicText>
            </View>

            {data?.scorers.length === 0 ? (
              <View style={{ padding: 20 }}>
                <ArabicText style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>
                  لا تتوفر بيانات الهدافين لهذه البطولة حاليًا.
                </ArabicText>
              </View>
            ) : (
              data?.scorers.map(item => (
                <ScorerRow key={item.player.id} item={item} />
              ))
            )}
          </View>

          {/* Section 2 : إحصائيات الفرق (أقوى هجوم / أقوى دفاع) */}
          {((data?.bestAttacks.length ?? 0) > 0 || (data?.bestDefenses.length ?? 0) > 0) && (
            <View style={{ marginTop: 24, gap: 14 }}>
              <View style={styles.sectionHeader}>
                <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>
                  🛡️ إحصائيات الأندية
                </ArabicText>
              </View>

              <View style={[styles.teamStatsGrid, ui.row]}>
                {/* أقوى هجوم */}
                <View style={[styles.teamStatBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={[styles.teamStatTitleRow, ui.row, { gap: 6 }]}>
                    <Icon name="trophy" size={14} color={colors.green} />
                    <ArabicText style={[styles.teamStatTitle, { color: colors.green }]}>
                      أقوى هجوم (أهداف)
                    </ArabicText>
                  </View>
                  {data?.bestAttacks.map(item => (
                    <TeamRankLine key={item.team.id} item={item} />
                  ))}
                </View>

                {/* أقوى دفاع */}
                <View style={[styles.teamStatBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={[styles.teamStatTitleRow, ui.row, { gap: 6 }]}>
                    <Icon name="bookmark" size={14} color="#2563EB" />
                    <ArabicText style={[styles.teamStatTitle, { color: '#2563EB' }]}>
                      أقوى دفاع (استقبل)
                    </ArabicText>
                  </View>
                  {data?.bestDefenses.map(item => (
                    <TeamRankLine key={item.team.id} item={item} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
});

function ScorerRow({ item }: { item: ScorerItem }) {
  const { colors } = usePreferences();
  const isTopThree = item.rank <= 3;

  return (
    <View style={[styles.tableRow, ui.row, { borderBottomColor: colors.line }]}>
      {/* Position # */}
      <View style={styles.colRank}>
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: isTopThree ? '#DCFCE7' : 'transparent' },
          ]}
        >
          <ArabicText
            style={[
              styles.rankText,
              { color: isTopThree ? '#15803D' : colors.muted },
            ]}
          >
            {item.rank}
          </ArabicText>
        </View>
      </View>

      {/* Nom du joueur + Écusson du club */}
      <View style={[styles.colPlayer, ui.row, { gap: 8 }]}>
        {item.team.crest ? (
          <Image source={{ uri: item.team.crest }} style={styles.teamLogo} contentFit="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <ArabicText
            numberOfLines={1}
            style={[styles.playerName, { color: colors.ink }]}
          >
            {item.player.nameAr || item.player.name}
          </ArabicText>
          <ArabicText
            numberOfLines={1}
            style={[styles.playerTeamName, { color: colors.muted }]}
          >
            {item.team.nameAr || item.team.shortName || item.team.name}
          </ArabicText>
        </View>
      </View>

      {/* Matchs joués */}
      <ArabicText style={[styles.colSmall, styles.statText, { color: colors.muted }]}>
        {item.playedMatches}
      </ArabicText>

      {/* Passes décisives */}
      <ArabicText style={[styles.colSmall, styles.statText, { color: colors.muted }]}>
        {item.assists !== null ? item.assists : '-'}
      </ArabicText>

      {/* Buts */}
      <ArabicText style={[styles.colGoals, styles.goalsText, { color: colors.green }]}>
        {item.goals}
      </ArabicText>
    </View>
  );
}

function TeamRankLine({ item }: { item: TeamStatItem }) {
  const { colors } = usePreferences();
  return (
    <View style={[styles.teamRankLine, ui.row]}>
      <ArabicText style={[styles.rankMini, { color: colors.muted }]}>
        {item.rank}.
      </ArabicText>
      {item.team.crest ? (
        <Image source={{ uri: item.team.crest }} style={styles.miniLogo} contentFit="contain" />
      ) : null}
      <ArabicText numberOfLines={1} style={[styles.teamMiniName, { color: colors.ink }]}>
        {item.team.nameAr || item.team.shortName || item.team.name}
      </ArabicText>
      <ArabicText style={[styles.teamStatValue, { color: colors.ink }]}>
        {item.value}
      </ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chipsWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 10,
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
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  centerBox: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiRow: {
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: fonts.heading,
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  tableCard: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  tableRow: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  colRank: {
    width: 26,
    alignItems: 'center',
  },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  colPlayer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  teamLogo: {
    width: 22,
    height: 22,
  },
  playerName: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  playerTeamName: {
    fontSize: 10,
  },
  colSmall: {
    width: 32,
    textAlign: 'center',
  },
  colGoals: {
    width: 44,
    textAlign: 'center',
  },
  statText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  goalsText: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
  teamStatsGrid: {
    gap: 10,
  },
  teamStatBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  teamStatTitleRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  teamStatTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  teamRankLine: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  rankMini: {
    fontSize: 10,
    fontFamily: fonts.bold,
    width: 14,
  },
  miniLogo: {
    width: 16,
    height: 16,
  },
  teamMiniName: {
    flex: 1,
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  teamStatValue: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
});
