<script setup lang="ts">
import type { DashboardStatsResponse } from "@/types/models";
import { NCard, NGrid, NGridItem, NSpace, NTag, NTooltip } from "naive-ui";
import { computed, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useDataFormat } from "@/composables/useDataFormat";
import { usePerformance } from "@/composables/usePerformance";
import KeyIcon from "./icons/KeyIcon.vue";
import ClockIcon from "./icons/ClockIcon.vue";
import TrendingUpIcon from "./icons/TrendingUpIcon.vue";
import ShieldCheckIcon from "./icons/ShieldCheckIcon.vue";

const { t } = useI18n();
const { 
  safeNumber, 
  safeNumberOrNull, 
  formatValue, 
  formatTrend, 
  formatPercentage,
  safeRatio,
  trendToRatio,
  errorRateToRatio,
  isValidNumber 
} = useDataFormat();
const { debouncedWatch, optimizedUpdate } = usePerformance();

// Props
interface Props {
  stats: DashboardStatsResponse | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// 使用计算属性代替ref
const stats = computed(() => props.stats);
const animatedValues = ref<{
  key_count: number;
  rpm: number;
  request_count: number;
  error_rate: number;
}>({
  key_count: 0,
  rpm: 0,
  request_count: 0,
  error_rate: 0,
});

// 监听stats变化并更新动画值
const updateAnimatedValues = () => {
  if (!stats.value) {
    // Reset to avoid stale widths when data is absent
    animatedValues.value = {
      key_count: 0,
      rpm: 0,
      request_count: 0,
      error_rate: 0,
    };
    return;
  }
  
  // 使用优化的更新策略
  optimizedUpdate(() => {
    // 计算 key_count 比率
    const kcValue = safeNumber(stats.value?.key_count?.value);
    const kcSub = safeNumber(stats.value?.key_count?.sub_value);
    const keyCountRatio = safeRatio(kcValue, kcValue + kcSub);

    // 计算趋势相关比率
    const rpmRatio = trendToRatio(stats.value?.rpm?.trend);
    const reqRatio = trendToRatio(stats.value?.request_count?.trend);
    const errRatio = errorRateToRatio(stats.value?.error_rate?.value);

    animatedValues.value = {
      key_count: keyCountRatio,
      rpm: rpmRatio,
      request_count: reqRatio,
      error_rate: errRatio,
    };
  }, "high");
};

// 使用防抖监听 stats 变化（含初始）
debouncedWatch(
  () => props.stats,
  () => {
    updateAnimatedValues();
  },
  150, // 150ms 防抖延迟
  { immediate: true, deep: true }
);
</script>

<template>
  <div 
    class="stats-container"
    role="region"
    :aria-busy="props.loading"
    aria-live="polite"
    aria-label="仪表盘统计数据"
  >
    <n-space vertical size="medium">
      <n-grid 
        cols="2 s:4" 
        :x-gap="20" 
        :y-gap="20" 
        responsive="screen"
        role="grid"
        aria-label="统计卡片网格"
      >
        <!-- 密钥数量 -->
        <n-grid-item span="1">
          <n-card 
            :bordered="false" 
            class="stat-card" 
            style="animation-delay: 0s"
            role="region"
            :aria-label="`密钥统计：${formatValue(stats?.key_count?.value)} 个密钥`"
          >
            <div class="stat-header">
              <div 
                class="stat-icon key-icon" 
                aria-hidden="true"
              >
                <key-icon />
              </div>
              <n-tooltip v-if="Number(stats?.key_count?.sub_value) > 0" trigger="hover">
                <template #trigger>
                  <n-tag 
                    type="error" 
                    size="small" 
                    class="stat-trend"
                    :aria-label="`异常密钥：${stats?.key_count?.sub_value} 个`"
                  >
                    {{ stats?.key_count?.sub_value }}
                  </n-tag>
                </template>
                {{ stats?.key_count?.sub_value_tip }}
              </n-tooltip>
            </div>

            <div class="stat-content">
              <div 
                class="stat-value"
                :aria-label="`密钥总数：${formatValue(stats?.key_count?.value)}`"
              >
                {{ formatValue(stats?.key_count?.value) }}
              </div>
              <div class="stat-title">{{ t("dashboard.totalKeys") }}</div>
            </div>

            <div 
              class="stat-bar"
              role="progressbar"
              :aria-valuenow="Math.round((animatedValues.key_count ?? 0) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuetext="`${Math.round((animatedValues.key_count ?? 0) * 100)}%`"
              :aria-label="`密钥使用比例：${Math.round((animatedValues.key_count ?? 0) * 100)}%`"
            >
              <div
                class="stat-bar-fill key-bar"
                :style="{
                  width: `${(animatedValues.key_count ?? 0) * 100}%`,
                }"
              />
            </div>
          </n-card>
        </n-grid-item>

        <!-- RPM (10分钟) -->
        <n-grid-item span="1">
          <n-card 
            :bordered="false" 
            class="stat-card" 
            style="animation-delay: 0.05s"
            role="region"
            :aria-label="`RPM 统计：${
              isValidNumber(stats?.rpm?.value)
                ? safeNumber(stats?.rpm?.value).toFixed(1)
                : '--'
            } 请求每分钟`"
          >
            <div class="stat-header">
              <div 
                class="stat-icon rpm-icon" 
                aria-hidden="true"
              >
                <clock-icon />
              </div>
              <n-tag
                v-if="stats?.rpm?.trend != null && stats?.rpm?.trend !== 0"
                :type="stats?.rpm?.trend_is_growth ? 'success' : 'error'"
                size="small"
                class="stat-trend"
                :aria-label="`趋势：${formatTrend(stats?.rpm?.trend)}`"
              >
                {{ formatTrend(stats?.rpm?.trend) }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div 
                class="stat-value"
                :aria-label="`每分钟请求数：${
                  isValidNumber(stats?.rpm?.value)
                    ? safeNumber(stats?.rpm?.value).toFixed(1)
                    : '--'
                }`"
              >
                {{
                  isValidNumber(stats?.rpm?.value)
                    ? safeNumber(stats?.rpm?.value).toFixed(1)
                    : "--"
                }}
              </div>
              <div class="stat-title">{{ t("dashboard.rpm10Min") }}</div>
            </div>

            <div 
              class="stat-bar"
              role="progressbar"
              :aria-valuenow="Math.round((animatedValues.rpm ?? 0) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuetext="`${Math.round((animatedValues.rpm ?? 0) * 100)}%`"
              :aria-label="`RPM 趋势指示：${Math.round((animatedValues.rpm ?? 0) * 100)}%`"
            >
              <div
                class="stat-bar-fill rpm-bar"
                :style="{
                  width: `${(animatedValues.rpm ?? 0) * 100}%`,
                }"
              />
            </div>
          </n-card>
        </n-grid-item>

        <!-- 24小时请求 -->
        <n-grid-item span="1">
          <n-card :bordered="false" class="stat-card" style="animation-delay: 0.1s">
            <div class="stat-header">
              <div class="stat-icon request-icon" aria-hidden="true"><trending-up-icon /></div>
              <n-tag
                v-if="stats?.request_count?.trend != null && stats?.request_count?.trend !== 0"
                :type="stats?.request_count?.trend_is_growth ? 'success' : 'error'"
                size="small"
                class="stat-trend"
              >
                {{ formatTrend(stats?.request_count?.trend) }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{ formatValue(stats?.request_count?.value) }}
              </div>
              <div class="stat-title">{{ t("dashboard.requests24h") }}</div>
            </div>

            <div 
              class="stat-bar"
              role="progressbar"
              :aria-valuenow="Math.round((animatedValues.request_count ?? 0) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuetext="`${Math.round((animatedValues.request_count ?? 0) * 100)}%`"
              :aria-label="`请求趋势指示：${Math.round((animatedValues.request_count ?? 0) * 100)}%`"
            >
              <div
                class="stat-bar-fill request-bar"
                :style="{
                  width: `${(animatedValues.request_count ?? 0) * 100}%`,
                }"
              />
            </div>
          </n-card>
        </n-grid-item>

        <!-- 24小时错误率 -->
        <n-grid-item span="1">
          <n-card :bordered="false" class="stat-card" style="animation-delay: 0.15s">
            <div class="stat-header">
              <div class="stat-icon error-icon" aria-hidden="true"><shield-check-icon /></div>
              <n-tag
                v-if="stats?.error_rate?.trend != null && stats?.error_rate?.trend !== 0"
                :type="stats?.error_rate?.trend_is_growth ? 'error' : 'success'"
                size="small"
                class="stat-trend"
              >
                {{ formatTrend(stats?.error_rate?.trend) }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{ formatValue(stats?.error_rate?.value, "rate") }}
              </div>
              <div class="stat-title">{{ t("dashboard.errorRate24h") }}</div>
            </div>

            <div 
              class="stat-bar"
              role="progressbar"
              :aria-valuenow="Math.round((animatedValues.error_rate ?? 0) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuetext="`${Math.round((animatedValues.error_rate ?? 0) * 100)}%`"
              :aria-label="`成功率指示：${Math.round((animatedValues.error_rate ?? 0) * 100)}%`"
            >
              <div
                class="stat-bar-fill error-bar"
                :style="{
                  width: `${(animatedValues.error_rate ?? 0) * 100}%`,
                }"
              />
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-space>
  </div>
</template>

<style scoped lang="scss">
@import "@/styles/components.scss";

.stats-container {
  width: 100%;
  margin-bottom: 16px;
  @include stat-animations;
}

.stat-card {
  @include stat-card;
  @include stat-animation-delays;
}

.stat-header {
  @include stat-header;
}

.stat-icon {
  @include stat-icon;
}

@include stat-icon-colors;

.stat-trend {
  @include stat-trend;
}

.stat-content {
  @include stat-content;
}

.stat-value {
  @include stat-value;
}

.stat-title {
  @include stat-title;
}

.stat-bar {
  @include stat-bar;
}

.stat-bar-fill {
  @include stat-bar-fill;
}

@include stat-bar-colors;
@include stat-grid-responsive;
</style>
