import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../global/Icon';

type PlanType = 'free' | 'basic' | 'pro';

interface SubscriptionBadgeProps {
  plan: PlanType;
  size?: 'small' | 'medium';
}

const PLAN_CONFIG = {
  free: {
    label: 'Free',
    gradient: ['#10B981', '#34D399'],
    icon: 'paper-plane',
  },
  basic: {
    label: 'Basic',
    gradient: ['#3B82F6', '#60A5FA'],
    icon: 'rocket',
  },
  pro: {
    label: 'Pro',
    gradient: ['#FF6B00', '#FF9500'],
    icon: 'diamond',
  },
};

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  plan,
  size = 'small',
}) => {
  const config = PLAN_CONFIG[plan];
  const isSmall = size === 'small';

  return (
    <LinearGradient
      colors={config.gradient}
      style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Icon
        name={config.icon}
        iconFamily="Ionicons"
        size={isSmall ? 10 : 14}
        color="#fff"
      />
      <Text style={[styles.label, isSmall ? styles.labelSmall : styles.labelMedium]}>
        {config.label}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  label: {
    color: '#fff',
    fontFamily: 'Okra-Bold',
  },
  labelSmall: {
    fontSize: 10,
  },
  labelMedium: {
    fontSize: 12,
  },
});

export default SubscriptionBadge;
