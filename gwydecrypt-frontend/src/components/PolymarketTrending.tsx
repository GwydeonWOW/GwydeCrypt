import { useEffect, useState } from 'react';
import { Paper, Text, Group, Badge, Stack, Loader, Anchor, Select, SimpleGrid, Progress } from '@mantine/core';
import { IconTrendingUp, IconExternalLink } from '@tabler/icons-react';
import api from '../api/axios';

interface Market {
  id: string;
  slug: string;
  question: string;
  description: string;
  outcome_prices: number[];
  volume: number;
  tags: string[];
  end_date?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'economy', label: 'Economía' },
  { value: 'politics', label: 'Política' },
  { value: 'geopolitics', label: 'Geopolítica' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'finance', label: 'Finanzas' },
];

export function PolymarketTrending() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(24);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/polymarket/trending');
        setMarkets(response.data.markets);
      } catch (err) {
        console.error('Error fetching Polymarket data:', err);
        setError('Error al cargar datos de Polymarket');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  const formatPrice = (price: number) => {
    return `${(price * 100).toFixed(0)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  // Get category label for footer
  const categoryLabel = selectedCategory !== 'all'
    ? CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.label.toLowerCase()
    : null;

  // Filter markets by selected category
  const filteredMarkets = markets.filter((market) => {
    if (selectedCategory === 'all') return true;

    // Filter by tags directly from Polymarket
    const tags = market.tags || [];
    return tags.includes(selectedCategory);
  });

  // Show only first N markets
  const displayedMarkets = filteredMarkets.slice(0, displayCount);
  const hasMore = filteredMarkets.length > displayCount;

  // Reset display count when category changes
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setDisplayCount(24);
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + 16);
  };

  if (loading) {
    return (
      <Paper
        p="xl"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <Stack align="center">
          <Loader color="#667eea" size="md" />
          <Text size="sm" c="dimmed">Cargando mercados de Polymarket...</Text>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        p="xl"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <Text size="sm" c="red">{error}</Text>
      </Paper>
    );
  }

  return (
    <Paper
      p="lg"
      radius="sm"
      withBorder
      sx={{
        backgroundColor: '#141719',
        borderColor: '#1f2326',
      }}
    >
      {/* Header */}
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <IconTrendingUp size={20} color="#667eea" />
          <Text size="18" fw={600} c="white">Polymarket Trending</Text>
        </Group>
        <Anchor
          href="https://polymarket.com"
          target="_blank"
          size="xs"
          c="dimmed"
          sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Ver más <IconExternalLink size={12} />
        </Anchor>
      </Group>

      {/* Category Filter */}
      <Select
        value={selectedCategory}
        onChange={(value) => handleCategoryChange(value as string)}
        data={CATEGORY_OPTIONS}
        mb="md"
        withinPortal
        styles={{
          input: {
            backgroundColor: '#0d0f12',
            borderColor: '#1f2326',
            color: '#909296',
          },
          dropdown: {
            backgroundColor: '#0d0f12',
            borderColor: '#1f2326',
          },
          item: {
            color: '#909296',
            '&[data-selected=true]': {
              backgroundColor: '#667eea',
              color: 'white',
            },
            '&:hover': {
              backgroundColor: '#1a1d21',
            },
          },
        }}
      />

      {/* Markets Grid - 3 per row */}
      {displayedMarkets.length === 0 ? (
        <Text ta="center" c="dimmed" py="xl">No hay mercados disponibles en esta categoría</Text>
      ) : (
        <SimpleGrid cols={4} spacing="md">
          {displayedMarkets.map((market, index) => {
            // Safely extract outcome prices with validation
            const outcomePrices = Array.isArray(market.outcome_prices) ? market.outcome_prices : [0, 0];
            const yesPrice = typeof outcomePrices[0] === 'number' ? outcomePrices[0] : 0;
            const noPrice = typeof outcomePrices[1] === 'number' ? outcomePrices[1] : 0;

            // Determine which is higher for coloring
            const yesColor = yesPrice > noPrice ? '#4ade80' : '#404144';
            const noColor = noPrice > yesPrice ? '#f87171' : '#404144';

            return (
              <Paper
                key={market.id}
                p="sm"
                radius="md"
                withBorder
                sx={{
                  backgroundColor: '#0d0f12',
                  borderColor: '#1f2326',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    borderColor: '#667eea',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                  },
                }}
                component="a"
                href={`https://polymarket.com/event/${market.slug}`}
                target="_blank"
              >
                {/* Title/Question - More prominent */}
                <Text
                  size="14"
                  fw={700}
                  c="white"
                  mb="xs"
                  lineClamp={3}
                  sx={{
                    minHeight: '54px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.3,
                  }}
                >
                  {market.question}
                </Text>

                {/* Custom StatsSegments-like visualization */}
                <div style={{ marginBottom: '12px' }}>
                  {/* Main percentage */}
                  <Group position="apart" mb={4}>
                    <Text size="11" c="dimmed">Probabilidad</Text>
                    <Text size="20" fw={800} c="white" lh={1}>
                      {formatPrice(yesPrice)}
                    </Text>
                  </Group>

                  {/* Segmented progress bar */}
                  <div style={{ position: 'relative' }}>
                    <Progress
                      value={yesPrice * 100}
                      size={8}
                      styles={{
                        root: {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        bar: {
                          background: `linear-gradient(90deg, ${yesColor} 0%, ${yesColor} ${yesPrice * 100}%, ${noColor} ${yesPrice * 100}%, ${noColor} 100%)`,
                        },
                      }}
                    />
                  </div>

                  {/* Labels below */}
                  <Group position="apart" mt={4}>
                    <Text size="10" fw={600} c={yesPrice > noPrice ? '#4ade80' : '#909296'}>
                      SÍ {formatPrice(yesPrice)}
                    </Text>
                    <Text size="10" fw={600} c={noPrice > yesPrice ? '#f87171' : '#909296'}>
                      NO {formatPrice(noPrice)}
                    </Text>
                  </Group>
                </div>

                {/* Footer: Volume and Rank */}
                <Group position="apart" mt="auto">
                  <Group spacing="xs">
                    <Text size="11" c="dimmed">Volumen:</Text>
                    <Text size="11" fw={600} c="white">
                      {formatVolume(market.volume)}
                    </Text>
                  </Group>
                  {index < 3 && (
                    <Badge
                      size="sm"
                      variant="filled"
                      sx={{
                        backgroundColor: '#667eea',
                        color: 'white',
                        fontWeight: 700,
                      }}
                    >
                      #{index + 1}
                    </Badge>
                  )}
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {/* Load More Button */}
      {hasMore && (
        <Stack align="center" mt="md">
          <Text size="11" c="dimmed" mb="xs">
            Mostrando {displayedMarkets.length} de {filteredMarkets.length} mercados
          </Text>
          <Paper
            component="button"
            px="xl"
            py="xs"
            onClick={loadMore}
            sx={{
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: 'sm',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#5568d3',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Cargar más
          </Paper>
        </Stack>
      )}

      {/* Footer */}
      <Group position="center" mt="md">
        <Text size="11" c="dimmed">
          {'Datos en tiempo real de Polymarket • Mostrando ' + displayedMarkets.length + ' de ' + filteredMarkets.length + ' mercados' + (categoryLabel ? ' en ' + categoryLabel : '')}
        </Text>
      </Group>
    </Paper>
  );
}
