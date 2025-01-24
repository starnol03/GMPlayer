<template>
  <!-- 滚动歌词 -->
  <div v-if="music.getPlaySongLyric.lrc[0]" :class="[
    setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
    setting.lyricsBlock === 'center' ? 'center' : 'top',
    music.getLoadingState ? 'loading' : ''
  ]" ref="containerRef">
    <!-- div class="placeholder" :style="setting.lyricsPosition === 'center' ? { justifyContent: 'center', padding: '0' } : null">
      <CountDown v-if="setting.countDownShow" :style="{ fontSize: setting.lyricsFontSize + 'vh' }" />
    </!-->
    
    <!-- 歌词容器 -->
    <div class="lyrics-container">
      <div class="amll-wrapper">
        <LyricPlayer
          v-show="isLyricReady"
          :lyric-lines="processedLyrics" 
          :enableBlur="setting.lyricsBlur"
          :enableScale="true"
          :playing="playStateRef"
          :current-time="currentTimeRef" 
          :line-click="e => {
            if (playStateRef) lrcTextClick(e.line.getLine().startTime)
          }"
          :wordFadeWidth="0.5"
          ref="playerRef"
        />
      </div>
    </div>
    
    <div class="placeholder" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { musicStore, settingStore } from "@/store";
import CountDown from "./CountDown.vue";
import { LyricPlayer } from "@applemusic-like-lyrics/vue";

const music = musicStore();
const setting = settingStore();
const currentTimeRef = ref(0);
const isLyricReady = ref(false);
const containerRef = ref(null);

const playerRef = ref();
const playStateRef = ref(false);

// 初始化当前时间
currentTimeRef.value = music.getPlaySongTime.currentTime;

onMounted(() => {
  nextTick(() => {
    if (playerRef.value?.lyricPlayer?.value) {
      const player = playerRef.value.lyricPlayer.value;
      player.setLinePosYSpringParams({
        mass: 1,
        stiffness: 170,
        damping: 26,
        velocity: 0
      });
    }
  });
});

console.log('歌词数据', music.getPlaySongLyric);

const processLyricLine = (line, index, array) => {
  if (!line) return null;
  
  const nextLine = array[index + 1];
  return {
    startTime: line.time || 0,
    endTime: nextLine ? nextLine.time : (line.time + (line.endTime || 0)),
    translatedLyric: setting.showTransl && line.tran ? line.tran : "",
    romanLyric: setting.showRoma && line.roma ? line.roma : "",
    isBG: false,
    isDuet: false,
  };
};

const processWords = (content, lineEndTime) => {
  if (!Array.isArray(content)) return [];
  
  return content
    .filter(char => char?.content)  // 只过滤掉content为空的情况
    .map((char, wordIndex, wordArray) => ({
      word: char.content,  // 保留原始内容，包括空格
      startTime: char.time,
      endTime: wordIndex === wordArray.length - 1 
        ? lineEndTime  // 最后一个词使用行的结束时间
        : wordArray[wordIndex + 1].time // 否则使用下一个词的开始时间
    }));
};

const processedLyrics = computed(() => {
  // 检查歌词数据是否有效
  if (!music.getPlaySongLyric?.lrc?.length) {
    return [];
  }

  if (!music.getPlaySongLyric.hasYrc || !setting.showYrc || !music.getPlaySongLyric.yrc?.length) {
    // 处理普通歌词
    return music.getPlaySongLyric.lrc
      .filter(line => line?.content?.length > 0)
      .map((line, index, array) => {
        const baseLine = processLyricLine(line, index, array);
        return {
          ...baseLine,
          originalLyric: Array.isArray(line.content) ? line.content.map(item => item.content) : [],
          words: Array.isArray(line.content) ? processWords(line.content, baseLine.endTime) : []
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
  playStateRef.value = newState;
});

// 更新当前时间
watch(
  () => music.getPlaySongTime.currentTime, 
  (newTime) => {
    currentTimeRef.value = newTime | 0;
  }
);

</script>

<style lang="scss">
.lrc-all {
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  scrollbar-width: none;
  max-width: 52vh;
  overflow: auto;
  padding: 0 10px;

  &.loading {
    opacity: 0 !important;
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

  .lyrics-container {
    width: 100%;
    flex: 1;
    position: relative;
    
    .amll-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      
      :deep(.amll-lyric-player) {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 100px;
        
        .lyric-line {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 1em;
          padding: 1.8vh 4vh 1.8vh 3vh;
        }
      }
    }
  }

  &::-webkit-scrollbar {
    display: none;
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
</style>
