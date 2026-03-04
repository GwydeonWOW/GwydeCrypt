import { useState } from 'react';
import { Title, Paper, Stack, Text, Group, Badge, Button, Select, LoadingOverlay, TextInput, Skeleton, Pagination, Menu, MultiSelect, RangeSlider } from '@mantine/core';
import { IconTrendingUp, IconCoins, IconFlame, IconExternalLink, IconSearch, IconRefresh, IconFilter, IconChevronDown, IconSortDescending, IconSortAscending } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getPools, getPoolChains, poolsKeys, type Pool } from '../api/pools';
import { useDebouncedValue } from '@mantine/hooks';

const formatTVL = (value: number) => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const POOLS_PER_PAGE = 30;

type SortField = 'apy' | 'tvlUsd' | 'project' | 'chain';
type SortOrder = 'asc' | 'desc';

const PoolRow = ({ pool }: { pool: Pool }) => {
  const getRiskLevel = (): 'Low' | 'Medium' | 'High' => {
    if (pool.stablecoin) return 'Low';
    if (pool.ilRisk === 'no') return 'Low';
    if (pool.ilRisk === 'yes') return 'High';
    return 'Medium';
  };

  const riskLevel = getRiskLevel();
  const riskColor = {
    Low: 'green',
    Medium: 'yellow',
    High: 'red',
  }[riskLevel];

  const getPoolLink = () => {
    const projectUrls: Record<string, string> = {
      'uniswap': 'https://app.uniswap.org/explore/pools',
      'curve': 'https://curve.fi',
      'aave': 'https://aave.com',
      'compound': 'https://compound.finance',
      'lido': 'https://lido.fi',
      'balancer': 'https://balancer.fi',
      'sushiswap': 'https://app.sushi.com',
      'pancakeswap': 'https://pancakeswap.finance',
    };

    const projectLower = pool.project.toLowerCase();
    return projectUrls[projectLower] || `https://defillama.com/yields#project=${pool.project}`;
  };

  return (
    <Paper
      px="xs"
      py={6}
      mb={2}
      radius="sm"
      withBorder
      sx={{
        backgroundColor: '#141719',
        borderColor: '#1f2326',
        '&:hover': {
          borderColor: '#2a2f35',
          backgroundColor: '#161a1d',
        },
        transition: 'all 0.15s',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        {/* Left: Project info */}
        <div style={{ minWidth: 0, flex: '0 0 200px' }}>
          <Group gap={4} wrap="nowrap">
            <Text size="12" fw={600} c="white" style={{ textTransform: 'capitalize' }} truncate>
              {pool.project}
            </Text>
            {pool.stablecoin && (
              <Badge size="xs" color="blue" variant="light" style={{ fontSize: 9 }}>Stable</Badge>
            )}
          </Group>
          <Text size="10" c="dimmed" truncate>{pool.symbol}</Text>
        </div>

        {/* Chain */}
        <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
          <Text size="10" c="white" fw={500} style={{ textTransform: 'capitalize', lineHeight: 1.2 }} truncate>
            {pool.chain}
          </Text>
          <Badge color={riskColor} variant="light" size="xs" radius="sm" style={{ fontSize: 8 }}>
            {riskLevel}
          </Badge>
        </div>

        {/* Middle: Metrics in one line */}
        <div style={{ flex: '0 0 200px', textAlign: 'center' }}>
          <Text size="13" fw={700} c="white">{formatTVL(pool.tvlUsd)}</Text>
          <Text size="9" c="dimmed">TVL</Text>
        </div>

        <div style={{ flex: '0 0 60px', textAlign: 'center' }}>
          <Text size="14" fw={700} c={pool.apy >= 5 ? 'teal' : pool.apy >= 2 ? 'green' : 'white'} style={{ lineHeight: 1.1 }}>
            {pool.apy.toFixed(2)}%
          </Text>
          <Text size="9" c="dimmed">APY</Text>
        </div>

        {/* Right: Action */}
        <Button
          component="a"
          href={getPoolLink()}
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          variant="light"
          radius="sm"
          px="xs"
          style={{ flex: '0 0 auto' }}
        >
          <IconExternalLink size={13} />
        </Button>
      </Group>
    </Paper>
  );
};

const SortButton = ({ label, field, currentField, currentOrder, onClick }: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onClick: () => void;
}) => {
  const isActive = currentField === field;
  const Icon = currentOrder === 'asc' ? IconSortAscending : IconSortDescending;

  return (
    <Button
      size="xs"
      variant={isActive ? 'light' : 'subtle'}
      onClick={onClick}
      px="xs"
      styles={{
        inner: { gap: 4 },
        label: { fontSize: 11 },
        rightSection: {
          display: isActive ? 'block' : 'none',
        },
      }}
      rightSection={isActive ? <Icon size={12} /> : undefined}
    >
      {label}
    </Button>
  );
};

const StatsRow = ({ stats, isLoading }: { stats: any; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <Group gap="md">
        {[1, 2, 3].map((i) => (
          <Paper key={i} p="xs" radius="sm" withBorder sx={{ backgroundColor: '#141719', borderColor: '#1f2326', flex: 1, height: 40 }} />
        ))}
      </Group>
    );
  }

  return (
    <Group gap="md">
      <Paper
        px="sm"
        py={6}
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Group gap={6}>
          <IconTrendingUp size={16} color="#667eea" />
          <Text size="10" c="dimmed" fw={500} tt="uppercase">Best APY</Text>
        </Group>
        <Text size="16" fw={700} c="white">
          {stats?.best_apy ? `${stats.best_apy.apy.toFixed(2)}%` : '-'}
        </Text>
      </Paper>

      <Paper
        px="sm"
        py={6}
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Group gap={6}>
          <IconFlame size={16} color="#fa5252" />
          <Text size="10" c="dimmed" fw={500} tt="uppercase">Total TVL</Text>
        </Group>
        <Text size="16" fw={700} c="white">
          {stats?.total_tvl ? `$${(stats.total_tvl / 1000000000).toFixed(1)}B` : '-'}
        </Text>
      </Paper>

      <Paper
        px="sm"
        py={6}
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Group gap={6}>
          <IconCoins size={16} color="#40c057" />
          <Text size="10" c="dimmed" fw={500} tt="uppercase">Avg APY</Text>
        </Group>
        <Text size="16" fw={700} c="white">
          {stats?.avg_apy ? `${stats.avg_apy.toFixed(2)}%` : '-'}
        </Text>
      </Paper>
    </Group>
  );
};

export default function Pools() {
  const [selectedChain, setSelectedChain] = useState<string | null>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('apy');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [stablecoinOnly, setStablecoinOnly] = useState<boolean>(false);
  const [apyRange, setApyRange] = useState<[number, number]>([0, 10000]);

  // Fetch chains
  const { data: chainsData } = useQuery({
    queryKey: poolsKeys.chains(),
    queryFn: getPoolChains,
    staleTime: 3600000,
  });

  const chains = chainsData?.chains || [];

  // Fetch pools - start with smaller limit and increase if needed
  const { data: poolsData, isLoading, error, refetch } = useQuery({
    queryKey: poolsKeys.list({
      chain: selectedChain || undefined,
      limit: 100, // Reduced from 500 to avoid timeout
    }),
    queryFn: () => getPools({
      chain: selectedChain || undefined,
      limit: 100, // Reduced from 500 to avoid timeout
    }),
    staleTime: 300000,
    retry: 2, // Retry failed requests
    retryDelay: 1000,
  });

  // Filter and sort pools
  const filteredAndSortedPools = (poolsData?.pools || [])
    .filter(pool => {
      // Search filter
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        if (
          !pool.project.toLowerCase().includes(search) &&
          !pool.symbol.toLowerCase().includes(search) &&
          !pool.chain.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Risk filter
      if (riskFilter.length > 0) {
        const getRiskLevel = () => {
          if (pool.stablecoin) return 'Low';
          if (pool.ilRisk === 'no') return 'Low';
          if (pool.ilRisk === 'yes') return 'High';
          return 'Medium';
        };
        if (!riskFilter.includes(getRiskLevel())) {
          return false;
        }
      }

      // Stablecoin filter
      if (stablecoinOnly && !pool.stablecoin) {
        return false;
      }

      // APY range filter
      if (pool.apy < apyRange[0] || pool.apy > apyRange[1]) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'apy':
          comparison = a.apy - b.apy;
          break;
        case 'tvlUsd':
          comparison = a.tvlUsd - b.tvlUsd;
          break;
        case 'project':
          comparison = a.project.localeCompare(b.project);
          break;
        case 'chain':
          comparison = a.chain.localeCompare(b.chain);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPools.length / POOLS_PER_PAGE);
  const paginatedPools = filteredAndSortedPools.slice(
    (currentPage - 1) * POOLS_PER_PAGE,
    currentPage * POOLS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setRiskFilter([]);
    setStablecoinOnly(false);
    setApyRange([0, 50]);
    setSelectedChain('');
    setCurrentPage(1);
  };

  return (
    <Stack gap="sm">
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} c="white" size={20}>Yield Pools</Title>
          <Text size="11" c="dimmed" mt={2}>
            {filteredAndSortedPools.length} pools • Data from DefiLlama
          </Text>
        </div>
      </Group>

      {/* Stats Row */}
      <StatsRow stats={poolsData?.stats} isLoading={isLoading} />

      {/* Filters */}
      <Paper
        p="xs"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Group gap="sm">
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={12} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.currentTarget.value);
              setCurrentPage(1);
            }}
            style={{ flex: 1 }}
            size="xs"
            styles={{
              input: {
                backgroundColor: '#1f2326',
                borderColor: '#2a2f35',
                color: 'white',
                height: 28,
                fontSize: 12,
              },
            }}
          />
          <Select
            placeholder="Chain"
            clearable
            size="xs"
            data={['', ...chains.map(c => ({
              value: c,
              label: c.charAt(0).toUpperCase() + c.slice(1),
            }))]}
            value={selectedChain}
            onChange={(v) => {
              setSelectedChain(v);
              setCurrentPage(1);
            }}
            styles={{
              input: {
                backgroundColor: '#1f2326',
                borderColor: '#2a2f35',
                color: 'white',
                height: 28,
                fontSize: 12,
              },
            }}
            w={100}
          />
          <MultiSelect
            placeholder="Risk"
            data={['Low', 'Medium', 'High']}
            value={riskFilter}
            onChange={setRiskFilter}
            size="xs"
            styles={{
              input: {
                backgroundColor: '#1f2326',
                borderColor: '#2a2f35',
                color: 'white',
                height: 28,
                fontSize: 12,
              },
            }}
            w={100}
          />
          <Button
            size="xs"
            variant={stablecoinOnly ? 'light' : 'subtle'}
            onClick={() => setStablecoinOnly(!stablecoinOnly)}
            styles={{ label: { fontSize: 11 } }}
          >
            Stablecoin
          </Button>
          <Button
            size="xs"
            variant="light"
            onClick={resetFilters}
            styles={{ label: { fontSize: 11 } }}
          >
            Reset
          </Button>
          <Button
            variant="light"
            size="xs"
            onClick={() => refetch()}
            loading={isLoading}
            px="xs"
          >
            <IconRefresh size={14} />
          </Button>
        </Group>

        {/* APY Range Slider */}
        <Group gap="sm" mt="xs">
          <Text size={10} c="dimmed" w={30}>APY:</Text>
          <RangeSlider
            size="xs"
            min={0}
            max={50}
            step={0.5}
            value={apyRange}
            onChange={setApyRange}
            styles={{
              track: { backgroundColor: '#1f2326' },
              bar: { backgroundColor: '#2a2f35' },
            }}
            style={{ flex: 1 }}
          />
          <Text size={10} c="dimmed" w={70} ta="right">
            {apyRange[0]}% - {apyRange[1]}%
          </Text>
        </Group>
      </Paper>

      {/* Sort Controls */}
      <Group gap="xs">
        <Text size={10} c="dimmed">Sort by:</Text>
        <SortButton
          label="APY"
          field="apy"
          currentField={sortField}
          currentOrder={sortOrder}
          onClick={() => handleSort('apy')}
        />
        <SortButton
          label="TVL"
          field="tvlUsd"
          currentField={sortField}
          currentOrder={sortOrder}
          onClick={() => handleSort('tvlUsd')}
        />
        <SortButton
          label="Project"
          field="project"
          currentField={sortField}
          currentOrder={sortOrder}
          onClick={() => handleSort('project')}
        />
        <SortButton
          label="Chain"
          field="chain"
          currentField={sortField}
          currentOrder={sortOrder}
          onClick={() => handleSort('chain')}
        />
      </Group>

      {/* Error State */}
      {error && (
        <Paper
          p="sm"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#1a1515',
            borderColor: '#3a1f1f',
          }}
        >
          <Text c="red" size={11}>Failed to load pools. Please try again later.</Text>
        </Paper>
      )}

      {/* Pools List */}
      <Paper
        px="xs"
        pt="xs"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#0d0f11',
          borderColor: '#1f2326',
          minHeight: 450,
        }}
      >
        {isLoading ? (
          <Stack gap={2}>
            {[...Array(10)].map((_, i) => (
              <Paper key={i} px="xs" py={6} radius="sm" withBorder sx={{ backgroundColor: '#141719', borderColor: '#1f2326' }}>
                <Group>
                  <Skeleton height={14} width={120} />
                  <Skeleton height={14} width={80} />
                  <Skeleton height={14} width={60} style={{ marginLeft: 'auto' }} />
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : paginatedPools.length > 0 ? (
          <Stack gap={0}>
            {paginatedPools.map((pool) => (
              <PoolRow key={`${pool.pool}-${pool.chain}`} pool={pool} />
            ))}
          </Stack>
        ) : (
          <Text size={12} c="dimmed" ta="center" py="xl">
            No pools found matching your criteria.
          </Text>
        )}
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center" gap="xs">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
            size="sm"
            styles={{
              control: {
                backgroundColor: '#141719',
                borderColor: '#1f2326',
                '&[data-active]': {
                  backgroundColor: '#2a2f35',
                },
              },
            }}
          />
          <Text size={11} c="dimmed">
            {(currentPage - 1) * POOLS_PER_PAGE + 1} - {Math.min(currentPage * POOLS_PER_PAGE, filteredAndSortedPools.length)} of {filteredAndSortedPools.length}
          </Text>
        </Group>
      )}

      {/* Legend */}
      <Group gap="lg" px="xs">
        <Group gap={4}>
          <Badge size="xs" color="green" variant="light" style={{ fontSize: 8 }}>Low</Badge>
          <Text size={9} c="dimmed">Stablecoins / No IL</Text>
        </Group>
        <Group gap={4}>
          <Badge size="xs" color="yellow" variant="light" style={{ fontSize: 8 }}>Med</Badge>
          <Text size={9} c="dimmed">Some IL risk</Text>
        </Group>
        <Group gap={4}>
          <Badge size="xs" color="red" variant="light" style={{ fontSize: 8 }}>High</Badge>
          <Text size={9} c="dimmed">High IL risk</Text>
        </Group>
      </Group>
    </Stack>
  );
}
