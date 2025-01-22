<template>
  <!-- 滚动歌词 -->
  <div v-if="music.getPlaySongLyric.lrc[0]" :class="[
    setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
    setting.lyricsBlock === 'center' ? 'center' : 'top',
    music.getLoadingState ? 'loading' : ''
  ]" ref="containerRef">
    <div class="placeholder" :style="setting.lyricsPosition === 'center' ? { justifyContent: 'center', padding: '0' } : null">
      <CountDown v-if="setting.countDownShow" :style="{ fontSize: setting.lyricsFontSize + 'vh' }" />
    </div>
    
    <!-- 歌词容器 -->
    <div class="lyrics-container" ref="lyricsRef">
      <div v-for="(line, index) in processedLyrics" 
           :key="index"
           :class="['lyric-line', { active: currentLineIndex === index }]"
           :style="getLineStyle(index)"
           @click="lrcTextClick(line.startTime)">
        <div class="text" :style="{ fontSize: setting.lyricsFontSize + 'vh' }">
          <template v-if="line.words && line.words.length">
            <span v-for="(char, charIndex) in line.words" 
                  :key="charIndex"
                  :class="['char', { 
                    active: isCharActive(line, char, index),
                    transform: setting.showYrcTransform 
                  }]"
                  :style="getCharStyle(char)">
              {{ char.word }}<span class="word-space"> </span>
            </span>
          </template>
          <template v-else>
            {{ line.originalLyric }}
          </template>
        </div>
        <div v-if="line.translatedLyric && setting.showTransl" 
             class="translation" 
             :style="{ fontSize: (setting.lyricsFontSize - 1) + 'vh' }">
          {{ line.translatedLyric }}
        </div>
        <div v-if="line.romajiLyric && setting.showRoma" 
             class="romaji" 
             :style="{ fontSize: (setting.lyricsFontSize - 1.5) + 'vh' }">
          {{ line.romajiLyric }}
        </div>
      </div>
    </div>
    
    <div class="placeholder" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { musicStore, settingStore } from "@/store";
import CountDown from "./CountDown.vue";
import { LyricPlayer } from '@applemusic-like-lyrics/core';

const music = musicStore();
const setting = settingStore();

const containerRef = ref(null);
const lyricsRef = ref(null);
const currentLineIndex = ref(0);
let lyricPlayer = null;
let animationFrameId = null;
let lastTime = -1;

console.log('歌词数据', music.getPlaySongLyric);

// 处理歌词数据
const processedLyrics = computed(() => {
  if (!music.getPlaySongLyric.hasYrc || !setting.showYrc) {
    // 处理普通歌词
    return music.getPlaySongLyric.lrc.map((line, index, array) => ({
      startTime: line.time, // 转换为毫秒
      endTime: array[index + 1] ? array[index + 1].time : line.time + 5000, // 使用下一行的时间或默认持续5秒
      originalLyric: line.content,
      translatedLyric: setting.showTransl && line.tran ? line.tran : undefined,
      romanLyric: setting.showRoma && line.roma ? line.roma : undefined
    }));
  } else {
    // 处理逐字歌词
    return music.getPlaySongLyric.yrc.map((line, index, array) => ({
      startTime: line.time, // 转换为毫秒
      endTime: array[index + 1] ? array[index + 1].time : line.endTime,
      originalLyric: line.content.map(char => char.content), // 添加空格
      words: line.content.map(char => ({
        word: char.content,
        startTime: char.time,
        duration: char.duration
      })),
      translatedLyric: setting.showTransl && line.tran ? line.tran : undefined,
      romanLyric: setting.showRoma && line.roma ? line.roma : undefined
    }));
  }
});

// 动画帧更新函数
const frame = (time) => {
  try {
    if (lastTime === -1) {
      lastTime = time;
    }
    
    if (lyricPlayer && music.playState) {
      const currentTime = music.getPlaySongTime.currentTime;
      if (currentTime > 0) {
        const timeInMs = currentTime * 1000;
        lyricPlayer.setCurrentTime(currentTime);
        lyricPlayer.resetScroll();
        lyricPlayer.calcLayout();
        lyricPlayer.update(Math.abs(currentTime - lastTime));
        
        // 手动计算当前行索引
        const newLineIndex = processedLyrics.value.findIndex((line, index) => {
          const nextLine = processedLyrics.value[index + 1];
          return timeInMs >= line.startTime && 
                 (!nextLine || timeInMs < nextLine.startTime);
        });
        
        if (newLineIndex !== -1 && newLineIndex !== currentLineIndex.value) {
          currentLineIndex.value = newLineIndex;
          scrollToLine(newLineIndex);
        }
      }
    }
    
    lastTime = time;
    // 只有在播放状态下才继续请求动画帧
    if (music.playState) {
      animationFrameId = requestAnimationFrame(frame);
    } else {
      animationFrameId = null;
    }
  } catch (error) {
    console.error('动画帧更新错误:', error);
    animationFrameId = null;
  }
};

// 初始化歌词播放器
const initLyricPlayer = () => {
  try {
    // 清理旧的实例
    if (lyricPlayer) {
      lyricPlayer.dispose();
      lyricPlayer = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // 检查歌词数据
    if (!processedLyrics.value || processedLyrics.value.length === 0) {
      console.log('没有歌词数据，跳过初始化');
      return;
    }

    // 创建新实例
    lyricPlayer = new LyricPlayer();
    
    // 设置歌词
    lyricPlayer.setLyricLines(processedLyrics.value);
    
    // 设置播放状态
    lyricPlayer.playing = music.playState;

    // 立即定位到当前时间
    const currentTime = music.getPlaySongTime.currentTime;
    if (currentTime > 0) {
      const timeInMs = currentTime * 1000;
      lyricPlayer.setCurrentTime(currentTime);
      lyricPlayer.resetScroll();
      lyricPlayer.calcLayout();
      lyricPlayer.update(0);
      
      // 手动计算初始行索引
      const initialIndex = processedLyrics.value.findIndex((line, index) => {
        const nextLine = processedLyrics.value[index + 1];
        return timeInMs >= line.startTime && 
               (!nextLine || timeInMs < nextLine.startTime);
      });
      
      if (initialIndex !== -1) {
        currentLineIndex.value = initialIndex;
        scrollToLine(initialIndex);
      }
    }

    // 开始动画帧更新
    lastTime = -1;
    animationFrameId = requestAnimationFrame(frame);
  } catch (error) {
    console.error('歌词播放器初始化失败:', error);
  }
};

// 监听歌曲切换
watch(() => music.getPlaySongData?.id, (newId, oldId) => {
  if (newId !== oldId) {
    console.log('歌曲切换，重新初始化动画帧');
    // 取消当前的动画帧
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // 重置时间
    lastTime = -1;
    // 重新开始动画帧更新
    animationFrameId = requestAnimationFrame(frame);
  }
});

// 监听歌词数据变化
watch(() => music.getPlaySongLyric, () => {
  console.log('歌词数据变化，重新初始化');
  // 重置状态
  currentLineIndex.value = 0;
  lastTime = -1;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  nextTick(() => {
    initLyricPlayer();
  });
}, { deep: true });

// 监听播放状态变化
watch(() => music.playState, (playing) => {
  console.log('播放状态变化', playing);
  if (lyricPlayer) {
    lyricPlayer.playing = playing;
    // 如果开始播放且没有动画帧，则启动动画帧
    if (playing && !animationFrameId) {
      lastTime = -1;
      animationFrameId = requestAnimationFrame(frame);
    }
  }
});

// 监听播放时间变化
watch(() => music.getPlaySongTime.currentTime, (newTime) => {
  if (lyricPlayer && newTime > 0) {
    lyricPlayer.setCurrentTime(newTime);
  
    lyricPlayer.resetScroll();
    lyricPlayer.calcLayout();
    
    lyricPlayer.update(Math.abs(newTime - music.getPlaySongTime.currentTime));
  }
});

// 组件挂载时初始化
onMounted(() => {
  nextTick(() => {
    initLyricPlayer();
  });
});

// 滚动到指定行
const scrollToLine = (index) => {
  if (!lyricsRef.value || !containerRef.value) return;
  
  const container = containerRef.value;
  const lines = lyricsRef.value.children;
  if (!lines[index]) return;

  const line = lines[index];
  const containerHeight = container.clientHeight;
  const lineTop = line.offsetTop;
  const lineHeight = line.clientHeight;

  let scrollTop;
  if (setting.lyricsPosition === 'center') {
    scrollTop = lineTop - (containerHeight / 2) + (lineHeight / 2);
  } else {
    scrollTop = lineTop - containerHeight * 0.2;
  }

  // 使用 requestAnimationFrame 进行平滑滚动
  const currentScroll = container.scrollTop;
  const diff = scrollTop - currentScroll;
  const duration = 300; // 滚动动画持续时间（毫秒）
  const startTime = performance.now();

  const scroll = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 使用 easeInOutCubic 缓动函数
    const easeProgress = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    container.scrollTop = currentScroll + (diff * easeProgress);
    
    if (progress < 1) {
      requestAnimationFrame(scroll);
    }
  };

  requestAnimationFrame(scroll);
};

// 获取行样式
const getLineStyle = (index) => {
  const style = {
    marginBottom: `${setting.lyricsFontSize - 1.6}vh`,
  };

  if (setting.lyricsBlur) {
    const blur = Math.abs(currentLineIndex.value - index);
    style.filter = `blur(${blur}px)`;
  }

  return style;
};

// 获取字符样式
const getCharStyle = (char) => {
  if (!setting.showYrcAnimation) return {};
  
  return {
    '--duration': `${Math.max(char.duration - 0.2, 0.1)}s`,
  };
};

// 判断字符是否激活
const isCharActive = (line, char, lineIndex) => {
  if (currentLineIndex.value !== lineIndex) return false;
  const currentTime = music.getPlaySongTime.currentTime * 1000;
  return currentTime >= char.startTime && currentTime < (char.startTime + char.duration);
};

// 发送方法
const emit = defineEmits(["lrcTextClick"]);

// 歌词文本点击
const lrcTextClick = (time) => {
  emit("lrcTextClick", time / 1000); // 转换回秒
};

// 组件销毁时清理
onUnmounted(() => {
  if (lyricPlayer) {
    lyricPlayer.dispose();
    lyricPlayer = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
});
</script>

<style lang="scss">
@keyframes progress {
  0% {
    background-size: 0 100%;
  }

  100% {
    background-size: 100% 100%;
  }
}

@keyframes shine {
  0% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
  50% {
    text-shadow: 0 0 0.5em rgba(255, 255, 255, 0.7);
  }
  100% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
}

@keyframes emp {
  0% {
    opacity: 0.5;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 28px rgba(255, 255, 255, 0.9);
  }

  100% {
    opacity: 0.5;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
}

.lrc-all {
  display: flex;
  flex-direction: column;
  // margin-right: 20%;
  scroll-behavior: smooth;
  scrollbar-width: none;
  max-width: 52vh;
  overflow: auto;
  padding: 0 10px;
  opacity: 1;
  transform: translateZ(0) scale(1);
  will-change: auto;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.loading {
    opacity: 0 !important;
    transform: scale(0.8);
  }

  .placeholder {
    width: 100%;

    &:nth-of-type(1) {
      min-height: 50%;
      display: flex;
      align-items: flex-end;
      padding: 0 0 0.8vh 3vh;
    }

    &:nth-last-of-type(1) {
      min-height: 80%;
    }
  }

  .lrc,
  .yrc {
    will-change: filter, opacity, transform;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 1.8vh 4vh 1.8vh 3vh;
    box-sizing: border-box;
    border-radius: 8px;
    opacity: 0.3;
    transform: scale(0.75);
    transform-origin: left bottom;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;

    .lyric {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      font-weight: bold;

      .text {
        position: relative;
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

        .filler {
          transition: color 0.3s ease, opacity 0.3s ease;
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;

          &.animation {
            color: white;
            background: linear-gradient(to right, white, white) no-repeat 0 0;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            -webkit-background-clip: text;
            background-size: 0 100%;
          }
        }

        &.fill {
          &.transform {
            transform: translateY(-1.5px) scale(1.05);
          }

          .word {
            opacity: 0.3;
            transition: opacity 0.3s ease;
          }

          .filler {
            opacity: 1 !important;

            &.long {
              animation: progress, emp calc(var(--dur) * 1.2) cubic-bezier(0.23, 1, 0.32, 1) forwards !important;
            }

            &.animation {
              background-size: 100% 100%;
              animation: progress var(--dur) cubic-bezier(0.23, 1, 0.32, 1) forwards;
            }

            &.paused {
              animation-play-state: paused;
              -webkit-animation-play-state: paused;
            }
          }
        }
      }
    }

    .lyric-fy,
    .lyric-roma {
      margin-top: 4px;
      opacity: 0.6;
      transition: opacity 0.3s ease;
    }

    &.up,
    &.down {
      transform: scale(0.95);
    }

    &.on {
      opacity: 1;
      transform: scale(1);

      .lyric {
        .text {

          .word,
          .filler {
            opacity: 0.3;
          }
        }
      }
    }

    &:hover {
      transform: scale(1.1);
    }

    &::before {
      @media (min-width: 768px) {
        content: "";
        display: block;
        position: absolute;
        left: 0px;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        background-color: #ffffff20;
        opacity: 0;
        z-index: 0;
        transform: scale(1.05);
        transition: transform 0.3s ease, opacity 0.3s ease;
        pointer-events: none;
      }
    }

    &:hover {
      opacity: 1;

      &::before {
        transform: scale(1);
        opacity: 1;
      }
    }

    &:active {
      &::before {
        transform: scale(0.95);
      }
    }
  }

  &::-webkit-scrollbar {
    display: none;
  }

  &:hover {

    .lrc,
    .yrc {
      &.blur {
        filter: blur(0) !important;
      }
    }
  }

  &.cover {
    height: 80vh;
  }

  &.record {
    height: 70vh;
  }

  &.center {
    mask: linear-gradient(180deg,
        hsla(0, 0%, 100%, 0) 0,
        hsla(0, 0%, 100%, 0.6) 15%,
        #fff 25%,
        #fff 75%,
        hsla(0, 0%, 100%, 0.6) 85%,
        hsla(0, 0%, 100%, 0));
    -webkit-mask: linear-gradient(180deg,
        hsla(0, 0%, 100%, 0) 0,
        hsla(0, 0%, 100%, 0.6) 15%,
        #fff 25%,
        #fff 75%,
        hsla(0, 0%, 100%, 0.6) 85%,
        hsla(0, 0%, 100%, 0));
  }

  &.top {
    mask: linear-gradient(180deg,
        hsla(0, 0%, 100%, 0) 0,
        hsla(0, 0%, 100%, 0.6) 5%,
        #fff 10%,
        #fff 75%,
        hsla(0, 0%, 100%, 0.6) 85%,
        hsla(0, 0%, 100%, 0));
    -webkit-mask: linear-gradient(180deg,
        hsla(0, 0%, 100%, 0) 0,
        hsla(0, 0%, 100%, 0.6) 5%,
        #fff 10%,
        #fff 75%,
        hsla(0, 0%, 100%, 0.6) 85%,
        hsla(0, 0%, 100%, 0));

    .placeholder {
      &:nth-of-type(1) {
        min-height: 16%;
      }
    }
  }

  @media (max-width: 768px) {
    height: 70vh;
    margin-right: 0;
    padding: 0;
  }
}

@keyframes progress {
  0% {
    background-size: 0 100%;
  }

  100% {
    background-size: 100% 100%;
  }
}

@keyframes shine {
  0% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
  50% {
    text-shadow: 0 0 0.5em rgba(255, 255, 255, 0.7);
  }
  100% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
}

.lyric-line {
  display: flex;
  flex-direction: column;
  align-items: inherit;
  opacity: 0.3;
  transform: scale(0.75);
  transform-origin: left bottom;
  transition: all 0.3s ease;
  padding: 1.8vh 4vh 1.8vh 3vh;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }

  &.active {
    opacity: 1;
    transform: scale(1);
  }

  .text {
    font-weight: bold;
    display: flex;
    flex-wrap: wrap;

    .char {
      display: inline-block;
      opacity: 0.6;
      transition: all 0.3s ease;
      
      &.active {
        opacity: 1;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
      }

      &.transform {
        &.active {
          transform: translateY(-1.5px) scale(1.05);
        }
      }
    }

    .word-space {
      display: inline-block;
      width: 0.3em;
    }
  }

  .translation, .romaji {
    margin-top: 4px;
    opacity: 0.6;
  }
}

.char.active {
  animation: shine var(--duration, 0.3s) ease-in-out;
}
</style>
