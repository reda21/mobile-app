import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ArabicText, Icon, fonts, ui } from './news-ui';
import { usePreferences } from '../lib/preferences';
import { formatCount } from '../lib/format';
import { getMatches, formatMatchStatus, type Match } from '../lib/matches';

export const TodayMatchesPreview = memo(function TodayMatchesPreview() {
  const { colors } = usePreferences();
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getMatches({ forceReload: false })
      .then(res => {
        if (!mounted) return;
        const live = res.matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
        setLiveCount(live.length);
        // Prendre jusqu'à 3 matchs (priorité aux matchs en direct, puis du jour)
        const sorted = [...res.matches].sort((a, b) => {
          const aLive = a.status === 'IN_PLAY' || a.status === 'PAUSED' ? 1 : 0;
          const bLive = b.status === 'IN_PLAY' || b.status === 'PAUSED' ? 1 : 0;
          return bLive - aLive;
        });
        setMatches(sorted.slice(0, 3));
      })
      .catch(() => {
        // En cas d'erreur ou d'absence de réseau, le widget se masque discrètement
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (matches.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.header, ui.row]}>
        <View style={[ui.row, { gap: 6 }]}>
          <Icon name="trophy" size={17} color={colors.green} />
          <ArabicText style={[styles.title, { color: colors.ink }]}>مباريات اليوم</ArabicText>
          {liveCount > 0 && (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <ArabicText style={styles.liveText}>{formatCount(liveCount)} مباشر</ArabicText>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="عرض جدول كل المباريات"
          onPress={() => router.push('/matches')}
          style={[ui.row, { gap: 4 }]}
          hitSlop={8}
        >
          <ArabicText style={[styles.viewAllText, { color: colors.green }]}>
            عرض الكل ({formatCount(matches.length)})
          </ArabicText>
          <Icon name="chevronLeft" size={14} color={colors.green} />
        </Pressable>
      </View>

      <View style={styles.matchesList}>
        {matches.map(m => {
          const status = formatMatchStatus(m.status, m.utcDate);
          const isLive = status.isLive;
          const hasScore = m.score.fullTime.home !== null && m.score.fullTime.away !== null;

          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${m.homeTeam.nameAr} ضد ${m.awayTeam.nameAr}`}
              onPress={() => router.push('/matches')}
              style={[styles.matchItem, ui.row, { borderTopColor: colors.line }]}
            >
              <View style={[styles.teamSide, ui.row, { justifyContent: 'flex-start' }]}>
                {m.homeTeam.crest ? (
                  <Image source={{ uri: m.homeTeam.crest }} style={styles.teamLogo} contentFit="contain" />
                ) : null}
                <ArabicText numberOfLines={1} style={[styles.teamName, { color: colors.ink }]}>
                  {m.homeTeam.nameAr}
                </ArabicText>
              </View>

              <View style={styles.centerBadge}>
                {hasScore ? (
                  <ArabicText style={[styles.scoreText, isLive && { color: '#DC2626' }]}>
                    {formatCount(m.score.fullTime.home!)} : {formatCount(m.score.fullTime.away!)}
                  </ArabicText>
                ) : (
                  <ArabicText style={[styles.timeText, { color: colors.muted }]}>
                    {status.label}
                  </ArabicText>
                )}
                {isLive && (
                  <View style={styles.liveIndicator}>
                    <ArabicText style={styles.liveIndicatorText}>مباشر</ArabicText>
                  </View>
                )}
              </View>

              <View style={[styles.teamSide, ui.row, { justifyContent: 'flex-end' }]}>
                <ArabicText numberOfLines={1} style={[styles.teamName, { color: colors.ink }]}>
                  {m.awayTeam.nameAr}
                </ArabicText>
                {m.awayTeam.crest ? (
                  <Image source={{ uri: m.awayTeam.crest }} style={styles.teamLogo} contentFit="contain" />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 14,
    padding: 12,
  },
  header: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  liveTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#DC2626',
  },
  liveText: {
    color: '#DC2626',
    fontSize: 9,
    fontFamily: fonts.bold,
  },
  viewAllText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  matchesList: {
    gap: 0,
  },
  matchItem: {
    borderTopWidth: 1,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamSide: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  teamLogo: {
    width: 20,
    height: 20,
  },
  teamName: {
    fontSize: 11,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  centerBadge: {
    width: 60,
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  timeText: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  liveIndicator: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  liveIndicatorText: {
    color: '#DC2626',
    fontSize: 8,
    fontFamily: fonts.bold,
  },
});
