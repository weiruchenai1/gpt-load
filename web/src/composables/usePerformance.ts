import { ref, watch, nextTick } from "vue";
import type { WatchSource, WatchStopHandle, WatchCallback } from "vue";

/**
 * 性能优化相关的通用工具函数
 */
export function usePerformance() {
  /**
   * 防抖函数
   * @param fn 要防抖的函数
   * @param delay 延迟时间（毫秒）
   * @returns 防抖后的函数
   */
  const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    }) as T;
  };

  /**
   * 节流函数
   * @param fn 要节流的函数
   * @param delay 延迟时间（毫秒）
   * @returns 节流后的函数
   */
  const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T => {
    let lastCall = 0;
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  };

  /**
   * 防抖的数据更新监听器
   * @param source 监听的数据源
   * @param callback 回调函数
   * @param delay 防抖延迟（默认 100ms）
   * @param options 监听选项
   * @returns 停止监听的函数
   */
  const debouncedWatch = <T>(
    source: WatchSource<T>,
    callback: WatchCallback<T, T | undefined>,
    delay = 100,
    options: { immediate?: boolean; deep?: boolean } = {}
  ): WatchStopHandle => {
    const debouncedCallback = debounce(callback, delay);
    return watch(source, debouncedCallback, options);
  };

  /**
   * 批量更新优化的 nextTick 封装
   * @param callback 更新回调
   * @param priority 优先级（high: 立即执行，normal: 正常防抖，low: 更长延迟）
   */
  const optimizedUpdate = (
    callback: () => void,
    priority: "high" | "normal" | "low" = "normal"
  ): void => {
    const delays = {
      high: 0,
      normal: 100,
      low: 300,
    };

    if (priority === "high") {
      nextTick(callback);
    } else {
      const debouncedCallback = debounce(callback, delays[priority]);
      nextTick(debouncedCallback);
    }
  };

  /**
   * 创建响应式的加载状态管理
   */
  const useLoadingState = () => {
    const isLoading = ref(false);
    const loadingCount = ref(0);
    
    const startLoading = () => {
      loadingCount.value++;
      isLoading.value = true;
    };
    
    const stopLoading = () => {
      loadingCount.value = Math.max(0, loadingCount.value - 1);
      if (loadingCount.value === 0) {
        isLoading.value = false;
      }
    };
    
    const resetLoading = () => {
      loadingCount.value = 0;
      isLoading.value = false;
    };
    
    return {
      isLoading,
      startLoading,
      stopLoading,
      resetLoading,
    };
  };

  return {
    debounce,
    throttle,
    debouncedWatch,
    optimizedUpdate,
    useLoadingState,
  };
}