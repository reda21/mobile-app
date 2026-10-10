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
import { ArabicText, EmptyState, fonts, ui } from './news-ui';
import { usePreferences } from '../lib/preferences';
import { useNetworkStatus } from '../lib/network';
import {
  getStandings,
  AVAILABLE_STANDINGS_COMPETITIONS,
  type CompetitionStandingsResult,
  type StandingsCompetitionCode,
  type StandingsTableRow,
} from '../lib/standings';

export const StandingsTable = memo(function StandingsTable() {
  const { colors } = usePreferences();
  const { isOffline } = useNetworkStatus();
  const [selectedComp, setSelectedComp] = useState<StandingsCompetitionCode>('PD');
  const [data, setData] = useState<CompetitionStandingsResult | null>(null);
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

    getStandings(selectedComp, {
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
          setError(err?.message || 'تعذر تحميل جدول الترتيب. تحقق من اتصالك وحاول مجددًا.');
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

  const totalTable = data?.standings.find(s => s.type === 'TOTAL')?.table ?? data?.standings[0]?.table ?? [];

  return (
    <View style={styles.container}>
      {/* Sélecteur horizontal de compétitions */}
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
            📡 وضع عدم الاتصال — يتم عرض الترتيب المحفوظ محليًا
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

      {/* Contenu principal */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.green} />
          <ArabicText style={[styles.loadingText, { color: colors.muted }]}>
            جارٍ تحميل جدول الترتيب...
          </ArabicText>
        </View>
      ) : error && !data ? (
        <EmptyState
          title="تعذر تحميل الترتيب"
          message={error}
          retry={handleRefresh}
        />
      ) : totalTable.length === 0 ? (
        <EmptyState
          title="لا يوجد ترتيب متاح"
          message="لم تبدأ مباريات هذه البطولة بعد أو لم يُسجل جدول حتى الآن."
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
          {/* En-tête de la compétition */}
          {data?.competition && (
            <View style={[styles.compHeader, ui.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              {data.competition.emblem ? (
                <Image
                  source={{ uri: data.competition.emblem }}
                  style={styles.compEmblem}
                  contentFit="contain"
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <ArabicText style={[styles.compTitle, { color: colors.ink }]}>
                  {data.competition.nameAr || data.competition.name}
                </ArabicText>
                {data.season.currentMatchday ? (
                  <ArabicText style={[styles.compSub, { color: colors.muted }]}>
                    الجولة {data.season.currentMatchday}
                  </ArabicText>
                ) : null}
              </View>
            </View>
          )}

          {/* Tableau des classements */}
          <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {/* Ligne d'en-tête du tableau */}
            <View style={[styles.tableHeaderRow, ui.row, { borderBottomColor: colors.line }]}>
              <ArabicText style={[styles.colRank, styles.headerLabel, { color: colors.muted }]}>#</ArabicText>
              <ArabicText style={[styles.colTeam, styles.headerLabel, { color: colors.muted }]}>الفريق</ArabicText>
              <ArabicText style={[styles.colStat, styles.headerLabel, { color: colors.muted }]}>لعب</ArabicText>
              <ArabicText style={[styles.colStat, styles.headerLabel, { color: colors.muted }]}>ف</ArabicText>
              <ArabicText style={[styles.colStat, styles.headerLabel, { color: colors.muted }]}>ت</ArabicText>
              <ArabicText style={[styles.colStat, styles.headerLabel, { color: colors.muted }]}>خ</ArabicText>
              <ArabicText style={[styles.colDiff, styles.headerLabel, { color: colors.muted }]}>+/-</ArabicText>
              <ArabicText style={[styles.colPts, styles.headerLabel, { color: colors.green }]}>نقاط</ArabicText>
            </View>

            {/* Lignes d'équipes */}
            {totalTable.map(row => (
              <TableRow key={row.position} row={row} totalCount={totalTable.length} />
            ))}
          </View>

          {/* Légende explicative */}
          <View style={[styles.legendCard, ui.row, { borderColor: colors.line }]}>
            <View style={[ui.row, { gap: 6 }]}>
              <View style={[styles.legendDot, { backgroundColor: '#176347' }]} />
              <ArabicText style={[styles.legendText, { color: colors.muted }]}>دوري أبطال أوروبا</ArabicText>
            </View>
            <View style={[ui.row, { gap: 6 }]}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <ArabicText style={[styles.legendText, { color: colors.muted }]}>الدوري الأوروبي</ArabicText>
            </View>
            <View style={[ui.row, { gap: 6 }]}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <ArabicText style={[styles.legendText, { color: colors.muted }]}>الهبوط</ArabicText>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
});

function TableRow({ row, totalCount }: { row: StandingsTableRow; totalCount: number }) {
  const { colors } = usePreferences();
  const isTopFour = row.position <= 4;
  const isEuropa = row.position === 5 || row.position === 6;
  const isRelegation = totalCount >= 18 && row.position > totalCount - 3;

  let rankBg = 'transparent';
  let rankTextColor = colors.muted;

  if (isTopFour) {
    rankBg = '#DCFCE7';
    rankTextColor = '#15803D';
  } else if (isEuropa) {
    rankBg = '#DBEAFE';
    rankTextColor = '#1D4ED8';
  } else if (isRelegation) {
    rankBg = '#FEE2E2';
    rankTextColor = '#B91C1C';
  }

  return (
    <View style={[styles.tableRow, ui.row, { borderBottomColor: colors.line }]}>
      {/* Position # avec badge couleur */}
      <View style={styles.colRank}>
        <View style={[styles.rankBadge, { backgroundColor: rankBg }]}>
          <ArabicText style={[styles.rankText, { color: rankTextColor }]}>
            {row.position}
          </ArabicText>
        </View>
      </View>

      {/* Équipe : Écusson + Nom en arabe */}
      <View style={[styles.colTeam, ui.row, { gap: 8 }]}>
        {row.team.crest ? (
          <Image source={{ uri: row.team.crest }} style={styles.teamCrest} contentFit="contain" />
        ) : null}
        <ArabicText
          numberOfLines={1}
          style={[styles.teamName, { color: colors.ink }]}
        >
          {row.team.nameAr || row.team.shortName || row.team.name}
        </ArabicText>
      </View>

      {/* Statistiques (L, F, T, X, +/-) */}
      <ArabicText style={[styles.colStat, styles.statText, { color: colors.muted }]}>
        {row.playedGames}
      </ArabicText>
      <ArabicText style={[styles.colStat, styles.statText, { color: colors.muted }]}>
        {row.won}
      </ArabicText>
      <ArabicText style={[styles.colStat, styles.statText, { color: colors.muted }]}>
        {row.draw}
      </ArabicText>
      <ArabicText style={[styles.colStat, styles.statText, { color: colors.muted }]}>
        {row.lost}
      </ArabicText>
      <ArabicText style={[styles.colDiff, styles.statText, { color: colors.muted }]}>
        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
      </ArabicText>

      {/* Points */}
      <ArabicText style={[styles.colPts, styles.pointsText, { color: colors.green }]}>
        {row.points}
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
  compHeader: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  compEmblem: {
    width: 32,
    height: 32,
  },
  compTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  compSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  colRank: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  colTeam: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  teamCrest: {
    width: 20,
    height: 20,
  },
  teamName: {
    fontSize: 11,
    fontFamily: fonts.medium,
    flexShrink: 1,
    textAlign: 'right',
  },
  colStat: {
    width: 26,
    textAlign: 'center',
  },
  colDiff: {
    width: 30,
    textAlign: 'center',
  },
  colPts: {
    width: 32,
    textAlign: 'center',
  },
  statText: {
    fontSize: 10,
    fontFamily: fonts.body,
  },
  pointsText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  legendCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
});
