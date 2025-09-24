<script setup lang="ts">
import type { DashboardStatsResponse } from "@/types/models";
import { NCard, NGrid, NGridItem, NSpace, NTag, NTooltip } from "naive-ui";
import { computed, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import KeyIcon from "./icons/KeyIcon.vue";
import ClockIcon from "./icons/ClockIcon.vue";
import TrendingUpIcon from "./icons/TrendingUpIcon.vue";
import ShieldCheckIcon from "./icons/ShieldCheckIcon.vue";

const { t } = useI18n();

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

// 格式化数值显示
const formatValue = (value: number, type: "count" | "rate" = "count"): string => {
  if (type === "rate") {
    return `${value.toFixed(1)}%`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// 格式化趋势显示
const formatTrend = (trend: number): string => {
  const sign = trend >= 0 ? "+" : "";
  return `${sign}${trend.toFixed(1)}%`;
};

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
  nextTick(() => {
    const kcValue = stats.value?.key_count?.value ?? 0;
    const kcSub = stats.value?.key_count?.sub_value ?? 0;
    const kcTotal = kcValue + kcSub;
    const keyCountRatio = kcTotal > 0 ? kcValue / kcTotal : 0;

    const rpmTrend = stats.value?.rpm?.trend ?? 0;
    const rpmRatio = Math.min(Math.max((100 + rpmTrend) / 100, 0), 1);

    const reqTrend = stats.value?.request_count?.trend ?? 0;
    const reqRatio = Math.min(Math.max((100 + reqTrend) / 100, 0), 1);

    const errValue = stats.value?.error_rate?.value ?? 0;
    const errRatio = Math.min(Math.max((100 - errValue) / 100, 0), 1);

    animatedValues.value = {
      key_count: keyCountRatio,
      rpm: rpmRatio,
      request_count: reqRatio,
      error_rate: errRatio,
    };
  });
};

// 监听 stats 变化（含初始）
watch(
  stats,
  () => {
    updateAnimatedValues();
  },
  { immediate: true }
);
</script>

<template>
  <div class="stats-container">
    <n-space vertical size="medium">
      <n-grid cols="2 s:4" :x-gap="20" :y-gap="20" responsive="screen">
        <!-- 密钥数量 -->
        <n-grid-item span="1">
          <n-card :bordered="false" class="stat-card" style="animation-delay: 0s">
            <div class="stat-header">
              <div class="stat-icon key-icon"><key-icon /></div>
              <n-tooltip v-if="stats?.key_count?.sub_value" trigger="hover">
                <template #trigger>
                  <n-tag type="error" size="small" class="stat-trend">
                    {{ stats?.key_count?.sub_value }}
                  </n-tag>
                </template>
                {{ stats?.key_count?.sub_value_tip }}
              </n-tooltip>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{ stats?.key_count?.value ?? 0 }}
              </div>
              <div class="stat-title">{{ t("dashboard.totalKeys") }}</div>
            </div>

            <div class="stat-bar">
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
          <n-card :bordered="false" class="stat-card" style="animation-delay: 0.05s">
            <div class="stat-header">
              <div class="stat-icon rpm-icon"><clock-icon /></div>
              <n-tag
                v-if="stats?.rpm && stats.rpm.trend != null"
                :type="stats?.rpm.trend_is_growth ? 'success' : 'error'"
                size="small"
                class="stat-trend"
              >
                {{ stats ? formatTrend(stats.rpm.trend) : "--" }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{ stats?.rpm?.value != null ? Number(stats.rpm.value).toFixed(1) : "0.0" }}
              </div>
              <div class="stat-title">{{ t("dashboard.rpm10Min") }}</div>
            </div>

            <div class="stat-bar">
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
              <div class="stat-icon request-icon"><trending-up-icon /></div>
              <n-tag
                v-if="stats?.request_count && stats.request_count.trend != null"
                :type="stats?.request_count.trend_is_growth ? 'success' : 'error'"
                size="small"
                class="stat-trend"
              >
                {{ stats ? formatTrend(stats.request_count.trend) : "--" }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{
                  stats?.request_count?.value != null
                    ? formatValue(Number(stats.request_count.value))
                    : "--"
                }}
              </div>
              <div class="stat-title">{{ t("dashboard.requests24h") }}</div>
            </div>

            <div class="stat-bar">
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
              <div class="stat-icon error-icon"><shield-check-icon /></div>
              <n-tag
                v-if="stats?.error_rate?.trend != null && stats.error_rate.trend !== 0"
                :type="stats?.error_rate.trend_is_growth ? 'error' : 'success'"
                size="small"
                class="stat-trend"
              >
                {{ stats?.error_rate ? formatTrend(stats.error_rate.trend) : "--" }}
              </n-tag>
            </div>

            <div class="stat-content">
              <div class="stat-value">
                {{
                  stats?.error_rate?.value != null
                    ? formatValue(Number(stats.error_rate.value), "rate")
                    : "--"
                }}
              </div>
              <div class="stat-title">{{ t("dashboard.errorRate24h") }}</div>
            </div>

            <div class="stat-bar">
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

<style scoped>
.stats-container {
  width: 100%;
  animation: fadeInUp 0.2s ease-out;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color-light);
  position: relative;
  overflow: hidden;
  animation: slideInUp 0.2s ease-out both;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  box-shadow: var(--shadow-md);
}

.key-icon {
  background: var(--primary-color);
  color: white;
}

.rpm-icon {
  background: var(--success-color);
  color: white;
}

.request-icon {
  background: #f59e0b;
  color: white;
}

.error-icon {
  background: var(--error-color);
  color: white;
}

.stat-trend {
  font-weight: 600;
}

.stat-content {
  margin-bottom: 16px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-title {
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-bar {
  width: 100%;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease-out;
  transition-delay: 0.2s;
}

.key-bar {
  background: var(--primary-color);
}

.rpm-bar {
  background: var(--success-color);
}

.request-bar {
  background: #f59e0b;
}

.error-bar {
  background: var(--error-color);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式网格 */
:deep(.n-grid-item) {
  min-width: 0;
}
</style>
