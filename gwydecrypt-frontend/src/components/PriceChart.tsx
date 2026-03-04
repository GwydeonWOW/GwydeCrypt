import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@mantine/core';
import api from '../api/axios';

interface PriceHistoryItem {
  timestamp: string;
  price_usd: string;
}

interface ChartDataPoint {
  timestamp: Date;
  price: number;
}

interface PriceChartProps {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  period?: '1d' | '3d' | '1w' | '1m' | '3m' | '6m' | '1y';
  color?: string;
}

export default function PriceChart({ tokenId, tokenSymbol, tokenName, period = '1w', color = '#667eea' }: PriceChartProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['price-history', tokenId, period],
    queryFn: async (): Promise<PriceHistoryItem[]> => {
      const response = await api.get(`/market/token/${tokenId}/history`, { params: { period } });
      return response.data.history;
    },
    enabled: !!tokenId,
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
          Loading chart data...
        </Text>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
          No price data available
        </Text>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = history.map((item: PriceHistoryItem) => ({
    timestamp: new Date(item.timestamp),
    price: parseFloat(item.price_usd),
  }));

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));

  // Calculate current price and change
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const previousPrice = chartData.length > 0 ? chartData[0].price : 0;
  const priceChange = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div style={{ width: '100%', height: 300, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <Text size="lg" fw={600} c="white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
          {tokenName} ({tokenSymbol})
        </Text>
        <div style={{ textAlign: 'right' }}>
          <Text size="sm" fw={700} c="white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </Text>
          <Text size="xs" fw={600} c={isPositive ? '#4ade80' : '#f87171'} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </Text>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => {
              const date = new Date(timestamp);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            stroke="#909296"
            style={{ fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
          />
          <YAxis
            domain={[minPrice * 0.995, maxPrice * 1.005]}
            tickFormatter={(price) => `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
            stroke="#909296"
            style={{ fontSize: '12px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2326',
              border: '1px solid #2a2f35',
              borderRadius: '4px',
              padding: '8px 12px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
            }}
            itemStyle={{ color: '#fff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
            labelStyle={{ color: '#909296', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
            formatter={(value: number) => {
              return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
            }}
            labelFormatter={(label: Date | string) => {
              return new Date(label).toLocaleString();
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
