export type AppLanguage = 'vi' | 'en' | 'ja';

export interface TranslationDictionary {
  nav: {
    features: string;
    pricing: string;
    faq: string;
    developers: string;
    onPrem: string;
    systemPrivacy: string;
    systemShort: string;
    polyglotMatrix: string;
  };
  hero: {
    infraBadge: string;
    infraSub: string;
    titleLine1: string;
    titleLine2: string;
    titleHighlight: string;
    titleEnd: string;
    description: string;
    btnCreate: string;
    btnCreating: string;
    btnEnterpriseSso: string;
    inputRoomCode: string;
    btnJoin: string;
    metricZeroStorage: string;
    metricZeroSub: string;
    metricLatency: string;
    metricLatencySub: string;
    metricOnPrem: string;
    metricOnPremSub: string;
    showPreview: string;
  };
  features: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: Array<{
      title: string;
      desc: string;
    }>;
  };
  pricing: {
    badge: string;
    title: string;
    subtitle: string;
    monthly: string;
    annual: string;
    savePercent: string;
    freeForever: string;
    perMonth: string;
    customEnterprise: string;
    tiers: {
      community: {
        name: string;
        desc: string;
        cta: string;
      };
      pro: {
        name: string;
        badge: string;
        desc: string;
        cta: string;
      };
      enterprise: {
        name: string;
        badge: string;
        desc: string;
        cta: string;
      };
    };
  };
  footer: {
    slogan: string;
    ramOnlyBadge: string;
    allSystems: string;
    operational: string;
    productCol: string;
    solutionCol: string;
    legalCol: string;
    mediaStudio: string;
    fasterWhisper: string;
    realtimeRedis: string;
    layaActionItems: string;
    pricingPlans: string;
    faq: string;
    devApi: string;
    newBadge: string;
    guides: string;
    bilingualVnJp: string;
    bilingualVnEn: string;
    bilingualVnZh: string;
    bilingualVnKo: string;
    compareZoom: string;
    compareMeet: string;
    tipsVnJp: string;
    reviewZoomAi: string;
    cLevelSecurity: string;
    onPremLan: string;
    glossaryTraining: string;
    privacyPolicy: string;
    termsOfService: string;
    refundPolicy: string;
    cookieSettings: string;
    systemStatus: string;
    contactSales: string;
    adminDashboard: string;
    complianceBadge: string;
    copyright: string;
    madeWith: string;
    forPolyglotTeams: string;
    operatorInfo: string;
    paymentNote: string;
  };
}
