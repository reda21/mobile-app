import { Frame, Header } from '../components/news-ui';
import { StatsView } from '../components/stats-view';

export default function StatsScreen() {
  return (
    <Frame bottom="matches">
      <Header />
      <StatsView />
    </Frame>
  );
}
