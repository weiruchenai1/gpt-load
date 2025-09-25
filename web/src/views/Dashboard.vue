<script setup lang="ts">
import { getDashboardStats } from "@/api/dashboard";
import BaseInfoCard from "@/components/BaseInfoCard.vue";
import EncryptionMismatchAlert from "@/components/EncryptionMismatchAlert.vue";
import LineChart from "@/components/LineChart.vue";
import SecurityAlert from "@/components/SecurityAlert.vue";
import type { DashboardStatsResponse } from "@/types/models";
import { useErrorHandling } from "@/composables/useErrorHandling";
import { usePerformance } from "@/composables/usePerformance";
import { NSpace, NSpin, NAlert, NButton } from "naive-ui";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const dashboardStats = ref<DashboardStatsResponse | null>(null);
const { withRetry, handleError, errorState, clearError } = useErrorHandling();
const { useLoadingState } = usePerformance();
const { isLoading, startLoading, stopLoading } = useLoadingState();

const loadDashboardData = async () => {
  startLoading();
  try {
    await withRetry(async () => {
      const response = await getDashboardStats();
      dashboardStats.value = response.data;
    }, 2, 1500); // 最多重试2次，延迟1.5秒
  } catch (error) {
    // 错误已被 withRetry 中的 handleError 处理
  } finally {
    stopLoading();
  }
};

const retryLoad = () => {
  clearError();
  loadDashboardData();
};

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="dashboard-container">
    <n-space vertical size="large" style="gap: 0 16px">
      <!-- 加密配置错误警告（优先级最高） -->
      <encryption-mismatch-alert />

      <!-- 数据加载错误提示 -->
      <n-alert
        v-if="errorState.hasError"
        type="error"
        :title="errorState.type === 'network' ? t('error.networkConnectionFailed', '网络连接失败') : t('error.dataLoadingFailed', '数据加载失败')"
        closable
        @close="clearError"
      >
        {{ errorState.message }}
        <template #action>
          <n-button size="small" @click="retryLoad" :loading="isLoading">
            {{ t('common.retry', '重试') }}
          </n-button>
        </template>
      </n-alert>

      <!-- 安全警告横幅 -->
      <security-alert
        v-if="dashboardStats?.security_warnings"
        :warnings="dashboardStats.security_warnings"
      />

      <!-- 加载状态 -->
      <n-spin :show="isLoading && !dashboardStats">
        <!-- 统计卡片 -->
        <base-info-card
          :stats="dashboardStats"
          :loading="isLoading"
        />
      </n-spin>

      <!-- 图表组件 -->
      <n-spin :show="isLoading">
        <line-chart class="dashboard-chart" />
      </n-spin>
    </n-space>
  </div>
</template>

<style scoped>
.dashboard-header-card {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color-light);
  animation: fadeInUp 0.2s ease-out;
}

.dashboard-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}

.dashboard-subtitle {
  font-size: 1.1rem;
  font-weight: 500;
}

.dashboard-chart {
  animation: fadeInUp 0.2s ease-out 0.2s both;
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
</style>
