import { APP_ASSETS } from '../lib/assets.ts';
import type { HomeBanner } from '../types/index.ts';
import {
  BANNER_DESTINATION_OPTIONS,
  PERSONAL_PHOTO_PRIMARY,
  PERSONAL_PHOTO_THUMBS_UP,
  SEED_HOME_BANNERS,
} from './seedBannersData.ts';

export {
  BANNER_DESTINATION_OPTIONS,
  PERSONAL_PHOTO_PRIMARY,
  PERSONAL_PHOTO_THUMBS_UP,
  SEED_HOME_BANNERS,
};

const ASSET_KEY_MAP: Record<string, string> = {
  'asset://personal_photo_primary': APP_ASSETS.personalPhotoPrimary,
  'asset://personal_photo_thumbs_up': APP_ASSETS.personalPhotoThumbsUp,
  'asset://banner_ai_teacher': APP_ASSETS.bannerAiTeacher,
  'asset://banner_complete_learning': APP_ASSETS.bannerCompleteLearning,
  'asset://banner_smart_tests': APP_ASSETS.bannerSmartTests,
  'asset://banner_study_progress': APP_ASSETS.bannerStudyProgress,
};

export function resolveBannerImageUrl(banner: Pick<HomeBanner, 'id' | 'imageUrl'>): string {
  if (banner.imageUrl && ASSET_KEY_MAP[banner.imageUrl]) {
    return ASSET_KEY_MAP[banner.imageUrl];
  }
  if (banner.imageUrl && banner.imageUrl.trim()) {
    return banner.imageUrl.trim();
  }
  const byIdKey = `asset://${banner.id}`;
  return ASSET_KEY_MAP[byIdKey] || APP_ASSETS.personalPhotoPrimary;
}
