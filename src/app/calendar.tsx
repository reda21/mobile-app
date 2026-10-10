import { Frame, Header } from '../components/news-ui';
import { CalendarView } from '../components/calendar-view';

export default function CalendarScreen() {
  return (
    <Frame bottom="matches">
      <Header />
      <CalendarView />
    </Frame>
  );
}
