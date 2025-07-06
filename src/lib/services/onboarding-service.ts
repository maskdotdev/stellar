import { useAIStore } from "@/lib/stores/ai-store"
import { useSettingsStore } from "@/lib/stores/settings-store"

export class OnboardingService {
  private static instance: OnboardingService

  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService()
    }
    return OnboardingService.instance
  }

  /**
   * Check if the user needs onboarding
   * Based purely on the onboardingCompleted flag
   */
  shouldShowOnboarding(): boolean {
    const settings = useSettingsStore.getState()
    
    // Only show onboarding if it hasn't been completed yet
    return !settings.app.onboardingCompleted
  }

  /**
   * Mark onboarding as completed
   */
  completeOnboarding(): void {
    const settings = useSettingsStore.getState()
    settings.setOnboardingCompleted(true)
  }

  /**
   * Reset onboarding state (for testing or admin purposes)
   */
  resetOnboarding(): void {
    const settings = useSettingsStore.getState()
    settings.setOnboardingCompleted(false)
  }

  /**
   * Hide onboarding (treat as completed)
   */
  hideOnboarding(): void {
    this.completeOnboarding()
  }

  /**
   * Check if this is a completely new user
   * Based only on onboarding completion flag
   */
  isNewUser(): boolean {
    const settings = useSettingsStore.getState()
    
    // If onboarding was completed, they're not new
    return !settings.app.onboardingCompleted
  }

  /**
   * Get onboarding status for debugging
   */
  getOnboardingStatus() {
    const settings = useSettingsStore.getState()
    const aiStore = useAIStore.getState()
    
    return {
      onboardingCompleted: settings.app.onboardingCompleted,
      shouldShow: this.shouldShowOnboarding(),
      isNewUser: this.isNewUser(),
      // AI provider info for debugging
      providersCount: aiStore.providers.length,
      enabledProvidersCount: aiStore.providers.filter(p => p.enabled).length,
      activeProvider: aiStore.activeProviderId,
      activeModel: aiStore.activeModelId,
    }
  }
} 