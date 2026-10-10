import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import { formatCount } from '../lib/format';
import { AVAILABLE_STANDINGS_COMPETITIONS, type StandingsCompetitionCode } from '../lib/standings';
import { formatMatchStatus, formatMatchTime, type Match } from '../lib/matches';
import {
  generateCalendarDays,
  getMatchesForDate,
  getMatchesForMatchday,
  COMPETITION_TOTAL_MATCHDAYS,
  type MatchdayCalendarResult,
} from '../lib/calendar';

type CalendarMode = 'byDate' | 'byMatchday';

export const CalendarView = memo(function CalendarView() {
  const { colors } = usePreferences();
  const { isOffline } = useNetworkStatus();
  const [mode, setMode] = useState<CalendarMode>('byDate');

  // Mode 1 : Par Date
  const days = useMemo(() => generateCalendarDays(-5, 16), []);
  const todayItem = useMemo(() => days.find(d => d.isToday) ?? days[0]!, [days]);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayItem.iso);
  const [dateMatches, setDateMatches] = useState<Match[]>([]);
  const [loadingDate, setLoadingDate] = useState(true);
  const [refreshingDate, setRefreshingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [dateReload, setDateReload] = useState(0);

  // Mode 2 : Par Journée
  const [selectedComp, setSelectedComp] = useState<StandingsCompetitionCode>('PD');
  const [selectedMatchday, setSelectedMatchday] = useState<number>(9);
  const [matchdayData, setMatchdayData] = useState<MatchdayCalendarResult | null>(null);
  const [loadingMatchday, setLoadingMatchday] = useState(false);
  const [refreshingMatchday, setRefreshingMatchday] = useState(false);
  const [matchdayError, setMatchdayError] = useState<string | null>(null);
  const [matchdayReload, setMatchdayReload] = useState(0);

  const handleSelectDate = useCallback((iso: string) => {
    setSelectedDateIso(iso);
    setLoadingDate(true);
    setDateError(null);
  }, []);

  const handleSelectMode = useCallback(
    (newMode: CalendarMode) => {
      setMode(newMode);
      if (newMode === 'byMatchday' && !matchdayData) {
        setLoadingMatchday(true);
        setMatchdayError(null);
      }
    },
    [matchdayData],
  );

  const handleSelectComp = useCallback((code: StandingsCompetitionCode) => {
    setSelectedComp(code);
    setLoadingMatchday(true);
    setMatchdayError(null);
  }, []);

  const handleSelectMatchday = useCallback((day: number) => {
    setSelectedMatchday(day);
    setLoadingMatchday(true);
    setMatchdayError(null);
  }, []);

  // Chargement des matchs par date
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    getMatchesForDate(selectedDateIso, {
      forceReload: dateReload > 0,
      signal: controller.signal,
    })
      .then(res => {
        if (active) {
          setDateMatches(res);
          setLoadingDate(false);
          setRefreshingDate(false);
        }
      })
      .catch(err => {
        if (active && !controller.signal.aborted) {
          setDateError(err?.message || 'تعذر تحميل مباريات هذا اليوم.');
          setLoadingDate(false);
          setRefreshingDate(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedDateIso, dateReload]);

  // Chargement des matchs par journée
  useEffect(() => {
    if (mode !== 'byMatchday') return;
    let active = true;
    const controller = new AbortController();

    getMatchesForMatchday(selectedComp, selectedMatchday, {
      forceReload: matchdayReload > 0,
      signal: controller.signal,
    })
      .then(res => {
        if (active) {
          setMatchdayData(res);
          setLoadingMatchday(false);
          setRefreshingMatchday(false);
        }
      })
      .catch(err => {
        if (active && !controller.signal.aborted) {
          setMatchdayError(err?.message || 'تعذر تحميل جدول هذه الجولة.');
          setLoadingMatchday(false);
          setRefreshingMatchday(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [mode, selectedComp, selectedMatchday, matchdayReload]);

  const handleRefreshDate = useCallback(() => {
    setRefreshingDate(true);
    setLoadingDate(true);
    setDateError(null);
    setDateReload(r => r + 1);
  }, []);

  const handleRefreshMatchday = useCallback(() => {
    setRefreshingMatchday(true);
    setLoadingMatchday(true);
    setMatchdayError(null);
    setMatchdayReload(r => r + 1);
  }, []);

  // Nombre total de journées pour la compétition sélectionnée
  const totalMatchdays = COMPETITION_TOTAL_MATCHDAYS[selectedComp] || 38;
  const matchdaysList = useMemo(() => {
    return Array.from({ length: totalMatchdays }, (_, i) => i + 1);
  }, [totalMatchdays]);

  return (
    <View style={styles.container}>
      {/* Bascule de mode : حسب التاريخ / حسب الجولات */}
      <View style={[styles.subSwitchRow, ui.row, { borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="المباريات حسب اليوم"
          accessibilityState={{ selected: mode === 'byDate' }}
          onPress={() => handleSelectMode('byDate')}
          style={[
            styles.subSwitchBtn,
            mode === 'byDate' && { borderBottomColor: colors.green, borderBottomWidth: 2.5 },
          ]}
        >
          <ArabicText
            style={[
              styles.subSwitchText,
              {
                color: mode === 'byDate' ? colors.green : colors.muted,
                fontFamily: mode === 'byDate' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            حسب اليوم
          </ArabicText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="المباريات حسب الجولات"
          accessibilityState={{ selected: mode === 'byMatchday' }}
          onPress={() => handleSelectMode('byMatchday')}
          style={[
            styles.subSwitchBtn,
            mode === 'byMatchday' && { borderBottomColor: colors.green, borderBottomWidth: 2.5 },
          ]}
        >
          <ArabicText
            style={[
              styles.subSwitchText,
              {
                color: mode === 'byMatchday' ? colors.green : colors.muted,
                fontFamily: mode === 'byMatchday' ? fonts.bold : fonts.medium,
              },
            ]}
          >
            حسب الجولات والبطولة
          </ArabicText>
        </Pressable>
      </View>

      {/* Bannière Hors-ligne */}
      {isOffline && (
        <View style={[styles.banner, ui.row, { backgroundColor: '#78350F' }]}>
          <ArabicText style={styles.bannerText}>
            📡 وضع عدم الاتصال — يتم عرض المباريات المحفوظة في الذاكرة
          </ArabicText>
        </View>
      )}

      {/* CONTENU MODE 1 : PAR DATE */}
      {mode === 'byDate' ? (
        <View style={{ flex: 1 }}>
          {/* Bandeau de dates interactif */}
          <View style={[styles.daysStripWrapper, { borderBottomColor: colors.line }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysStrip}
            >
              {days.map(day => {
                const isSelected = selectedDateIso === day.iso;
                return (
                  <Pressable
                    key={day.iso}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayNameAr} ${day.dayNumber} ${day.monthNameAr}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelectDate(day.iso)}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor: isSelected ? colors.green : colors.surface,
                        borderColor: isSelected ? colors.green : colors.line,
                      },
                    ]}
                  >
                    <ArabicText
                      style={[
                        styles.dayPillName,
                        { color: isSelected ? colors.paper : colors.muted },
                      ]}
                    >
                      {day.dayNameAr}
                    </ArabicText>
                    <ArabicText
                      style={[
                        styles.dayPillNum,
                        { color: isSelected ? colors.paper : colors.ink },
                      ]}
                    >
                      {day.dayNumber}
                    </ArabicText>
                    {day.isToday && (
                      <View
                        style={[
                          styles.todayDot,
                          { backgroundColor: isSelected ? colors.paper : colors.green },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Liste des matchs pour le jour sélectionné */}
          {loadingDate ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <ArabicText style={[styles.loadingText, { color: colors.muted }]}>
                جارٍ جلب مباريات هذا اليوم...
              </ArabicText>
            </View>
          ) : dateError && dateMatches.length === 0 ? (
            <EmptyState
              title="تعذر تحميل المباريات"
              message={dateError}
              retry={handleRefreshDate}
            />
          ) : dateMatches.length === 0 ? (
            <EmptyState
              title="لا توجد مباريات مجدولة لهذا اليوم"
              message="اختر يومًا آخر من الشريط بالأعلى للاطلاع على المواعيد."
              retry={handleRefreshDate}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.matchesScroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingDate}
                  onRefresh={handleRefreshDate}
                  tintColor={colors.green}
                  colors={[colors.green]}
                />
              }
            >
              <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                <ArabicText style={[styles.dateMatchesHeader, { color: colors.ink }]}>
                  {formatCount(dateMatches.length)} مباراة مجدولة
                </ArabicText>
                {selectedDateIso !== todayItem.iso && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="العودة إلى اليوم"
                    onPress={() => handleSelectDate(todayItem.iso)}
                    style={[ui.row, { gap: 4 }]}
                  >
                    <Icon name="clock" size={13} color={colors.green} />
                    <ArabicText style={{ color: colors.green, fontSize: 11, fontFamily: fonts.medium }}>
                      الذهاب لليوم
                    </ArabicText>
                  </Pressable>
                )}
              </View>

              <View style={styles.cardsList}>
                {dateMatches.map(m => (
                  <CalendarMatchCard key={m.id} match={m} />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : (
        /* CONTENU MODE 2 : PAR JOURNÉE ET CHAMPIONNAT */
        <View style={{ flex: 1 }}>
          {/* 1. Sélecteur de championnat */}
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

          {/* 2. Sélecteur horizontal de journées (الجولة 1، 2، 3...) */}
          <View style={[styles.matchdaysWrapper, { borderBottomColor: colors.line }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchdaysContainer}
            >
              {matchdaysList.map(md => {
                const isSelected = selectedMatchday === md;
                return (
                  <Pressable
                    key={md}
                    accessibilityRole="button"
                    accessibilityLabel={`الجولة ${md}`}
                    onPress={() => handleSelectMatchday(md)}
                    style={[
                      styles.matchdayPill,
                      {
                        backgroundColor: isSelected ? colors.green : colors.surface,
                        borderColor: isSelected ? colors.green : colors.line,
                      },
                    ]}
                  >
                    <ArabicText
                      style={[
                        styles.matchdayText,
                        { color: isSelected ? colors.paper : colors.ink },
                      ]}
                    >
                      الجولة {md}
                    </ArabicText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Liste des matchs de cette journée */}
          {loadingMatchday ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <ArabicText style={[styles.loadingText, { color: colors.muted }]}>
                جارٍ تحميل جدول الجولة {selectedMatchday}...
              </ArabicText>
            </View>
          ) : matchdayError && !matchdayData ? (
            <EmptyState
              title="تعذر تحميل الجولة"
              message={matchdayError}
              retry={handleRefreshMatchday}
            />
          ) : (matchdayData?.matches.length ?? 0) === 0 ? (
            <EmptyState
              title="لا تتوفر مواعيد لهذه الجولة بعد"
              message="اختر جولة أخرى للاطلاع على الجدول."
              retry={handleRefreshMatchday}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.matchesScroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingMatchday}
                  onRefresh={handleRefreshMatchday}
                  tintColor={colors.green}
                  colors={[colors.green]}
                />
              }
            >
              <View style={[styles.roundHeader, ui.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {matchdayData?.competition.emblem ? (
                  <Image source={{ uri: matchdayData.competition.emblem }} style={styles.roundEmblem} contentFit="contain" />
                ) : null}
                <ArabicText style={[styles.roundTitle, { color: colors.ink }]}>
                  {matchdayData?.competition.nameAr} — الجولة {selectedMatchday}
                </ArabicText>
              </View>

              <View style={styles.cardsList}>
                {matchdayData?.matches.map(m => (
                  <CalendarMatchCard key={m.id} match={m} />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
});

function CalendarMatchCard({ match }: { match: Match }) {
  const { colors } = usePreferences();
  const statusInfo = formatMatchStatus(match.status, match.utcDate);
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  const isFinished = statusInfo.isFinished;
  const isLive = statusInfo.isLive;

  return (
    <View style={[styles.matchCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* En-tête : Compétition & Statut */}
      <View style={[styles.cardHeader, ui.row]}>
        <View style={[ui.row, { gap: 6, flex: 1 }]}>
          {match.competition.emblem ? (
            <Image source={{ uri: match.competition.emblem }} style={styles.compLogoMini} contentFit="contain" />
          ) : null}
          <ArabicText numberOfLines={1} style={[styles.cardCompName, { color: colors.muted }]}>
            {match.competition.nameAr || match.competition.name}
          </ArabicText>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.badgeBg }]}>
          {isLive && <View style={styles.pulseDot} />}
          <ArabicText style={[styles.statusBadgeText, { color: statusInfo.badgeTextColor }]}>
            {statusInfo.label}
          </ArabicText>
        </View>
      </View>

      {/* Ligne des équipes */}
      <View style={[styles.teamsRow, ui.row]}>
        {/* Équipe Domicile */}
        <View style={styles.teamSide}>
          {match.homeTeam.crest ? (
            <Image source={{ uri: match.homeTeam.crest }} style={styles.teamLogo} contentFit="contain" />
          ) : null}
          <ArabicText numberOfLines={2} style={[styles.teamName, { color: colors.ink }]}>
            {match.homeTeam.nameAr}
          </ArabicText>
        </View>

        {/* Score / Heure */}
        <View style={styles.centerScoreBox}>
          {isFinished || isLive ? (
            <ArabicText style={[styles.scoreMain, isLive && { color: '#DC2626' }]}>
              {homeScore !== null ? homeScore : '-'} : {awayScore !== null ? awayScore : '-'}
            </ArabicText>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ArabicText style={[styles.upcomingTime, { color: colors.green }]}>
                {formatMatchTime(match.utcDate)}
              </ArabicText>
              <ArabicText style={[styles.vsText, { color: colors.muted }]}>ضد</ArabicText>
            </View>
          )}
        </View>

        {/* Équipe Extérieure */}
        <View style={styles.teamSide}>
          {match.awayTeam.crest ? (
            <Image source={{ uri: match.awayTeam.crest }} style={styles.teamLogo} contentFit="contain" />
          ) : null}
          <ArabicText numberOfLines={2} style={[styles.teamName, { color: colors.ink }]}>
            {match.awayTeam.nameAr}
          </ArabicText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subSwitchRow: {
    borderBottomWidth: 1,
  },
  subSwitchBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  subSwitchText: {
    fontSize: 12,
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
  daysStripWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  daysStrip: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  dayPill: {
    width: 58,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayPillName: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  dayPillNum: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  chipsWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  chipsContainer: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  matchdaysWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  matchdaysContainer: {
    paddingHorizontal: 14,
    gap: 6,
    flexDirection: 'row-reverse',
  },
  matchdayPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  matchdayText: {
    fontSize: 11,
    fontFamily: fonts.medium,
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
  matchesScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  dateMatchesHeader: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  roundHeader: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  roundEmblem: {
    width: 22,
    height: 22,
  },
  roundTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  cardsList: {
    gap: 10,
  },
  matchCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compLogoMini: {
    width: 16,
    height: 16,
  },
  cardCompName: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    gap: 4,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#DC2626',
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
  },
  teamsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamSide: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  teamLogo: {
    width: 30,
    height: 30,
  },
  teamName: {
    fontSize: 11,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  centerScoreBox: {
    width: 80,
    alignItems: 'center',
  },
  scoreMain: {
    fontSize: 18,
    fontFamily: fonts.heading,
  },
  upcomingTime: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  vsText: {
    fontSize: 9,
  },
});
