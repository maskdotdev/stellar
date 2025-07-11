export interface FeatureFlags {
  showGraphView: boolean
  showWorkspace: boolean
  showDebugHotkeys: boolean
  showAnalytics: boolean
  showSessions: boolean
}

export class FeatureFlagService {
  private static instance: FeatureFlagService
  private flags: FeatureFlags

  private constructor() {
    this.flags = {
      showGraphView: process.env.NODE_ENV === 'development',
      showWorkspace: process.env.NODE_ENV === 'development',
      showDebugHotkeys: process.env.NODE_ENV === 'development',
      showAnalytics: process.env.NODE_ENV === 'development',
      showSessions: process.env.NODE_ENV === 'development',
    }
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService()
    }
    return FeatureFlagService.instance
  }

  public isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature]
  }

  public getEnabledFeatures(): FeatureFlags {
    return { ...this.flags }
  }

  // Allow runtime toggling for development
  public toggleFeature(feature: keyof FeatureFlags): void {
    if (process.env.NODE_ENV === 'development') {
      this.flags[feature] = !this.flags[feature]
    }
  }

  // Override for specific features (useful for testing)
  public overrideFeature(feature: keyof FeatureFlags, enabled: boolean): void {
    if (process.env.NODE_ENV === 'development') {
      this.flags[feature] = enabled
    }
  }
}

// Convenience hook for React components
export const useFeatureFlags = () => {
  const service = FeatureFlagService.getInstance()
  return {
    isFeatureEnabled: (feature: keyof FeatureFlags) => service.isFeatureEnabled(feature),
    getEnabledFeatures: () => service.getEnabledFeatures(),
    toggleFeature: (feature: keyof FeatureFlags) => service.toggleFeature(feature),
    overrideFeature: (feature: keyof FeatureFlags, enabled: boolean) => service.overrideFeature(feature, enabled),
  }
} 