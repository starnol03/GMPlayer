<template>
  <!-- 滚动歌词 -->
  <div v-if="music.getPlaySongLyric.lrc[0]" :class="[
    setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
    setting.lyricsBlock === 'center' ? 'center' : 'top',
    music.getLoadingState ? 'loading' : ''
  ]" ref="containerRef">
    <div class="placeholder">
      <CountDown v-if="setting.countDownShow" :style="{ fontSize: setting.lyricsFontSize + 'vh' }" />
    </div>
    
    <!-- 歌词容器 -->
    <div class="lyrics-container">
      <div class="lyric-am" style="width: 100%; height: 100%; letter-spacing: normal;">
        <LyricPlayer
          v-show="isLyricReady"
          class="amll-lyric-player"
          :lyric-lines="processedLyrics" 
          :enableBlur="setting.lyricsBlur"
          :enableScale="true"
          :enableSpring="true"
          :playing="playStateRef"
          :currentTime="currentTimeRef"
          :wordAnimation="{
            name: 'spring',
            params: {
              tension: 170,
              friction: 15,
              mass: 1,
              precision: 0.01
            }
          }"
          :wordStyle="{
            transition: 'all 0.3s ease',
            '&.active': {
              color: 'var(--amll-lyric-view-color, rgb(239, 239, 239))',
              transform: 'scale(1.1)'
            },
            '&:not(.active)': {
              opacity: '0.5',
              transform: 'scale(0.9)'
            }
          }"
          @line-click="e => {
            if (playStateRef) lrcTextClick(e.line.getLine().startTime)
          }"
          :wordFadeWidth="0.5"
          :style="{
            '--amll-lyric-view-color': setting.immersivePlayer ? '--main-cover-color' : rgb(239, 239, 239),
            '--amll-lyric-player-font-size': setting.lyricsFontSize * 1.1 + 'vh',
            '--amll-lyric-player-line-height': '1.8',
            '--amll-lyric-player-active-line-scale': '1.1',
            'font-weight': 'bold',
            'font-size': '2.5vh'
          }"
          ref="playerRef"
        />
      </div>
    </div>
    
    <div class="placeholder" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { musicStore, settingStore } from "@/store";
import CountDown from "./CountDown.vue";
import { LyricPlayer } from "@applemusic-like-lyrics/vue";

const music = musicStore();
const setting = settingStore();
const currentTimeRef = ref(0);
const containerRef = ref(null);

const playerRef = ref();
const playStateRef = ref(false);

// 初始化当前时间
currentTimeRef.value = music.getPlaySongTime.currentTime;

console.log('歌词数据', music.getPlaySongLyric);

const LYRIC_ADVANCE_TIME = 0.3; // 歌词提前 0.3 秒显示

const processLyricLine = (line, index, array) => {
  if (!line) return null;
  
  const nextLine = array[index + 1];
  return {
    startTime: Math.max(0, (line.time || 0) - LYRIC_ADVANCE_TIME),
    endTime: nextLine ? (nextLine.time - LYRIC_ADVANCE_TIME) : (line.time + (line.endTime || 0) - LYRIC_ADVANCE_TIME),
    translatedLyric: setting.showTransl && line.tran ? line.tran : "",
    romanLyric: setting.showRoma && line.roma ? line.roma : "",
    isBG: false,
    isDuet: false,
  };
};

const processWords = (content, lineEndTime) => {
  if (!Array.isArray(content)) return [];
  
  return content
    .filter(char => char?.content)
    .map((char, wordIndex, wordArray) => ({
      word: char.content,
      startTime: Math.max(0, char.time - LYRIC_ADVANCE_TIME),
      endTime: wordIndex === wordArray.length - 1 
        ? lineEndTime - LYRIC_ADVANCE_TIME
        : wordArray[wordIndex + 1].time - LYRIC_ADVANCE_TIME
    }));
};

const processLrcWords = (line, endTime) => {
  if (!line?.content || typeof line.content !== 'string') return [];
  
  const words = line.content.match(/[\w']+|[.,!?;]|\s+/g) || [];
  if (!words.length) return [];
  
  const duration = (endTime - line.time) / words.length;
  
  return words.map((word, index) => ({
    word: word,
    startTime: Math.max(0, (line.time + duration * index) - LYRIC_ADVANCE_TIME),
    endTime: Math.max(0, (line.time + duration * (index + 1)) - LYRIC_ADVANCE_TIME)
  }));
};

const processedLyrics = computed(() => {
  if (!music.getPlaySongLyric?.lrc?.length) {
    return [];
  }

  if (!music.getPlaySongLyric.hasYrc || !setting.showYrc || !music.getPlaySongLyric.yrc?.length) {
    // 处理普通歌词
    return music.getPlaySongLyric.lrc
      .filter(line => line?.content)
      .map((line, index, array) => {
        const nextLine = array[index + 1];
        const endTime = nextLine ? nextLine.time : line.time + 5;
        
        const words = processLrcWords(line, endTime);
        
        return {
          startTime: Math.max(0, (line.time || 0) - LYRIC_ADVANCE_TIME),
          endTime: Math.max(0, endTime - LYRIC_ADVANCE_TIME),
          originalLyric: [line.content],
          words: words,
          translatedLyric: setting.showTransl && line.tran ? line.tran : "",
          romanLyric: setting.showRoma && line.roma ? line.roma : "",
          isBG: false,
          isDuet: false
        };
      });
  } else {
    // 处理逐字歌词
    return music.getPlaySongLyric.yrc
      .filter(line => line?.content?.length > 0)
      .map((line, index, array) => {
        const baseLine = processLyricLine(line, index, array);
        const cleanContent = Array.isArray(line.content) 
          ? line.content
            .filter(char => char?.content)
            .map(char => ({
              ...char,
              content: char.content
            }))
          : [];

        return {
          ...baseLine,
          originalLyric: cleanContent.map(char => char.content),
          words: processWords(cleanContent, baseLine.endTime)
        };
      });
  }
});

console.log('处理后的歌词数据', processedLyrics.value);

const emit = defineEmits(["lrcTextClick"]);

const lrcTextClick = (time) => {
  emit("lrcTextClick", time);
};
watch(() => music.getPlayState, (newState) => {
  console.log('播放状态', newState);
  playStateRef.value = newState;
});

// 更新当前时间
watch(
  () => music.getPlaySongTime.currentTime, 
  (newTime) => {
    currentTimeRef.value = newTime | 0;
  }
);

// 添加倒计时显示状态
const showCountDown = ref(true);

const isLyricReady = ref(false);

// 初始化歌词播放器
const initLyricPlayer = async () => {
  if (playerRef.value?.lyricPlayer?.value) {
    isLyricReady.value = false;
    await nextTick();
    // 等待 DOM 更新和布局计算
    setTimeout(() => {
      isLyricReady.value = true;
    }, 100);
  }
};

// 监听歌词数据变化
watch(() => music.getPlaySongLyric, async () => {
  await initLyricPlayer();
}, { immediate: true });

// 监听窗口大小变化
onMounted(() => {
  window.addEventListener('resize', initLyricPlayer);
});

</script>

<style lang="scss" scoped>
.lrc-all {
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  scrollbar-width: none;
  max-width: 90%;
  height: 100%;
  overflow: hidden;
  padding: 0 10px;
  position: relative;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    height: 70vh;
    margin-right: 0;
    padding: 0;
    max-width: 100%;
  }
}

.placeholder {
  height: 20%;
  width: 100%;
}

.lyrics-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lyric-am {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.2));
  mask: linear-gradient(
    180deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );

  :deep(.amll-lyric-player) {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 2.5vh;
    padding: 0 20px;
    
    .lyric-line {
      text-align: center;
      margin: 0.8em 0;
      line-height: 1.8;
      transition: all 0.3s ease;
      font-size: 2.5vh;
      width: 100%;
      white-space: normal;
      word-wrap: break-word;
      
      &.active {
        color: var(--amll-lyric-view-color, rgb(239, 239, 239));
        transform: scale(1.1);
      }
      
      &:not(.active) {
        opacity: 0.5;
        transform: scale(0.9);
      }

      @media (max-width: 768px) {
        font-size: 2.2vh;
        margin: 0.6em 0;
        line-height: 1.6;
      }
    }
  }
}
</style>
