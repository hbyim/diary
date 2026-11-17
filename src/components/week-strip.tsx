import { StyleSheet, Text, View } from 'react-native';

import { useApp, useDb } from '@/app-context';
import { getWrittenDates } from '@/lib/db';
import { addDays, dayOf, monthOf, parseISO, type ISODate } from '@/lib/dates';
import { fonts, radius, useColors } from '@/theme';

import { WeatherIcon } from './weather';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** The week (Sun–Sat) around `date`, as the calendar shows it, folded to one row while writing. */
export function WeekStrip({ date }: { date: ISODate }) {
  const c = useColors();
  const { today, start } = useApp();
  const written = useDb(() => new Map(getWrittenDates().map((d) => [d.date, d])), []);
  const sunday = addDays(date, -parseISO(date).getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const nth = Math.ceil(dayOf(date) / 7);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: '700', color: c.ink }}>
        {monthOf(date)}월 {['첫째', '둘째', '셋째', '넷째', '다섯째'][nth - 1]} 주
      </Text>
      <View style={styles.row}>
        {days.map((d, i) => {
          const w = written.get(d);
          const selected = d === date;
          const future = d > today || d < start;
          const bg = selected ? c.accent : w ? c.accent + '1F' : 'transparent';
          const border = !w && !future && !selected ? c.line : 'transparent';
          const fg = selected ? c.accentInk : future ? c.ink3 : c.ink;
          return (
            <View key={d} style={styles.cell}>
              <Text style={{ fontSize: 11, color: i === 0 ? c.danger : selected ? c.accent : c.ink3, fontWeight: selected ? '600' : '400' }}>
                {WEEK[i]}
              </Text>
              <View
                style={[
                  styles.day,
                  { backgroundColor: bg, borderColor: border, borderStyle: 'dashed', borderWidth: border === 'transparent' ? 0 : 1.5 },
                ]}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: fg }}>{dayOf(d)}</Text>
                {w?.weather && !selected ? <WeatherIcon kind={w.weather} size={12} color={c.accent} /> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, alignItems: 'center', gap: 3 },
  day: { width: '100%', height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
