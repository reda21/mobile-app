import { Frame, Header } from '../components/news-ui';
import { StandingsTable } from '../components/standings-table';

export default function StandingsScreen() {
  return (
    <Frame bottom="matches">
      <Header />
      <StandingsTable />
    </Frame>
  );
}
