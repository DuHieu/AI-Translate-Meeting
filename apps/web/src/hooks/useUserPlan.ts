import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context-def';
import { useLanguage } from '../context/language-context-def';
import { fetchSystemStatus, SystemLicenseInfo } from '../services/systemService';
import { meetingApi, AccountSubscriptionResponse } from '../api/meetingApi';

export interface UserPlanData {
  tier: string;
  tierLabel: string;
  badge: string;
  isTrial: boolean;
  status: string;
  maxConcurrentRooms: number;
  maxParticipantsPerRoom: number;
  roomsSummary: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  allowedFeatures: string[];
  organizationName: string;
  loading: boolean;
}

let cachedPlan: Partial<UserPlanData> | null = null;

export function useUserPlan(): UserPlanData {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [planState, setPlanState] = useState<Partial<UserPlanData>>(() => cachedPlan || {
    tier: 'pilot',
    tierLabel: 'PILOT',
    badge: 'PILOT',
    isTrial: true,
    status: 'trial',
    maxConcurrentRooms: 1,
    maxParticipantsPerRoom: 5,
    organizationName: 'Community Trial (Unlicensed)',
    allowedFeatures: ['glossary', 'minutes_export'],
    expiresAt: null,
    daysRemaining: null,
  });
  const [loading, setLoading] = useState<boolean>(!cachedPlan);

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      try {
        const sysStatus = await fetchSystemStatus();
        const license: SystemLicenseInfo | undefined = sysStatus.license;

        let sub: AccountSubscriptionResponse | null = null;
        if (user?.email) {
          try {
            sub = await meetingApi.getAccountSubscription(user.email);
          } catch {
            // Non-critical if billing service is not yet seeded
          }
        }

        const tier = (sub?.tier || license?.tier || sysStatus.deploymentProfile || 'pilot').toLowerCase();
        const isTrial = sub?.isPro ? false : (license?.status === 'trial' || !sub?.activePlanId);
        const status = sub?.isPro ? 'active' : (license?.status || (isTrial ? 'trial' : 'active'));
        const maxRooms = license?.maxConcurrentRooms ?? 1;
        const maxParticipants = license?.maxParticipantsPerRoom ?? 5;
        const orgName = license?.organizationName || (sub?.activePlanName || 'Community Trial (Unlicensed)');

        const tierLabel = tier.toUpperCase();
        const badge = isTrial ? 'PILOT' : tierLabel;

        const updated: Partial<UserPlanData> = {
          tier,
          tierLabel,
          badge,
          isTrial,
          status,
          maxConcurrentRooms: maxRooms,
          maxParticipantsPerRoom: maxParticipants,
          organizationName: orgName,
          allowedFeatures: license?.allowedFeatures || ['glossary', 'minutes_export'],
          expiresAt: sub?.expiresAt || license?.expiresAtUtc || null,
          daysRemaining: license?.daysRemaining ?? null,
        };

        cachedPlan = updated;
        if (isMounted) {
          setPlanState(updated);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const maxRooms = planState.maxConcurrentRooms ?? 1;
  const maxParticipants = planState.maxParticipantsPerRoom ?? 5;

  let roomsSummary = `${maxRooms} room · ${maxParticipants} participants`;
  if (language === 'vi') {
    roomsSummary = `${maxRooms} phòng · tối đa ${maxParticipants} người/phòng`;
  } else if (language === 'ja') {
    roomsSummary = `${maxRooms}ルーム · 最大${maxParticipants}名/室`;
  }

  return {
    tier: planState.tier || 'pilot',
    tierLabel: planState.tierLabel || 'PILOT',
    badge: planState.badge || 'PILOT',
    isTrial: planState.isTrial ?? true,
    status: planState.status || 'trial',
    maxConcurrentRooms: maxRooms,
    maxParticipantsPerRoom: maxParticipants,
    roomsSummary,
    expiresAt: planState.expiresAt || null,
    daysRemaining: planState.daysRemaining ?? null,
    allowedFeatures: planState.allowedFeatures || ['glossary', 'minutes_export'],
    organizationName: planState.organizationName || 'Community Trial',
    loading,
  };
}
