import TrendTab from '../components/TrendTab';

export default function CalorieTab({ openInput }: { openInput: (date: string) => void }) {
  return <TrendTab field="calories" unit="kcal" kind="bar" decimals={0} showChange={false} openInput={openInput} />;
}
