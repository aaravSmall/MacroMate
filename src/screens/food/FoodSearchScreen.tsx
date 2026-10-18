import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, EmptyState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { FoodResultRow, MIN_SEARCH_LENGTH, useFoodSearch } from '@/features/food';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { queryKeys } from '@/lib/queryKeys';
import { useTheme } from '@/theme';
import type { Food } from '@/types/domain';

export default function FoodSearchScreen() {
  const { spacing } = useTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 350);
  const search = useFoodSearch(debounced);
  const userId = useAuth().user?.id;

  const active = debounced.length >= MIN_SEARCH_LENGTH;
  const all = active ? (search.data ?? []) : [];
  const myMatches = all.filter((food) => food.ownerId !== null && food.ownerId === userId);
  const results = all.filter((food) => !myMatches.includes(food));

  function openFood(food: Food) {
    // Seed the detail cache so Open Food Facts results don't need a second request.
    queryClient.setQueryData(queryKeys.foods.detail(food.id), food);
    router.push({ pathname: '/food-detail/[id]', params: { id: food.id } });
  }

  const noResults = active && !search.isFetching && results.length === 0 && myMatches.length === 0;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <TextField
        label="Search foods"
        placeholder="e.g. chicken breast, Greek yogurt"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {!active ? (
        <Text variant="callout" tone="muted">
          Type at least {MIN_SEARCH_LENGTH} letters to search the food database and your My Foods.
        </Text>
      ) : null}

      {myMatches.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            My Foods
          </Text>
          <Card>
            {myMatches.map((food, i) => (
              <View key={food.id}>
                {i > 0 ? <Divider /> : null}
                <FoodResultRow food={food} onPress={() => openFood(food)} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {active ? (
        <QueryStatus
          loading={search.isFetching && all.length === 0}
          error={search.error}
          onRetry={() => void search.refetch()}
        />
      ) : null}

      {results.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Food database
          </Text>
          <Card>
            {results.map((food, i) => (
              <View key={food.id}>
                {i > 0 ? <Divider /> : null}
                <FoodResultRow food={food} onPress={() => openFood(food)} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {noResults ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description={`We couldn't find "${debounced}". You can add it yourself.`}
        />
      ) : null}
      {active ? (
        <Button title="Create a food" variant="ghost" onPress={() => router.push('/create-food')} />
      ) : null}
    </Screen>
  );
}
