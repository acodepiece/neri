import React, { memo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

type HeatmapValue = number | null | undefined;

type ActivityHeatmapProps = {
  weeks: number;
  days: number;
  values: HeatmapValue[];
  palette?: string[];
  emptyColor?: string;
  style?: ViewStyle;
  highlightIndices?: number[];
  highlightColor?: string;
  highlightBorderColor?: string;
};

const defaultPalette = ['#9be9a8', '#40c463', '#30a14e', '#216e39'];
const defaultEmptyColor = '#ebedf0';
const defaultHighlightColor = '#16A34A';
const defaultHighlightBorderColor = '#BBF7D0';

const ActivityHeatmapComponent: React.FC<ActivityHeatmapProps> = ({
  weeks,
  days,
  values,
  palette = defaultPalette,
  emptyColor = defaultEmptyColor,
  style,
  highlightIndices = [],
  highlightColor = defaultHighlightColor,
  highlightBorderColor = defaultHighlightBorderColor,
}) => {
  const totalCells = weeks * days;
  const paddedValues =
    values.length >= totalCells
      ? values.slice(0, totalCells)
      : [...values, ...Array.from({ length: totalCells - values.length }, () => null)];

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: weeks }).map((_, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.column}>
          {Array.from({ length: days }).map((_, dayIndex) => {
            const cellIndex = weekIndex * days + dayIndex;
            const value = paddedValues[cellIndex];
            const isHighlighted = highlightIndices.includes(cellIndex);
            const backgroundColor =
              value === null || value === undefined
                ? emptyColor
                : palette[Math.max(0, Math.min(palette.length - 1, value))] ?? palette[palette.length - 1];
            return (
              <View
                key={`day-${dayIndex}`}
                style={[
                  styles.square,
                  { backgroundColor: isHighlighted ? highlightColor : backgroundColor },
                  isHighlighted && { borderWidth: 1, borderColor: highlightBorderColor },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  column: {
    flexDirection: 'column',
    marginRight: 3,
  },
  square: {
    width: 12,
    height: 12,
    marginBottom: 3,
    borderRadius: 2,
  },
});

const ActivityHeatmap = memo(ActivityHeatmapComponent);

export default ActivityHeatmap;
