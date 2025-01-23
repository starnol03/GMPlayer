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
    <div class="lyrics-container">
      <LyricPlayer 
        v-if="isLyricReady"
        :lyric-lines="processedLyrics" 
        :enableBlur="setting.lyricsBlur"
        :enableScale="false"
        :current-time="currentTimeRef" 
        :line-click="e => {
          if (music.getPlayState) lrcTextClick(e.line.getLine().startTime / 1000)
        }"
        :wordFadeWidth="1"
      />
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

// 初始化当前时间
currentTimeRef.value = music.getPlaySongTime.currentTime;

console.log('歌词数据', music.getPlaySongLyric);

// 处理歌词数据
const processLyricLine = (line, index, array) => {
  const lineEndTime = array[index + 1] ? array[index + 1].time : array[index].time + line.endTime;
  return {
    startTime: line.time ?? 0,
    endTime: lineEndTime,
    translatedLyric: setting.showTransl && line.tran ? line.tran : "",
    romanLyric: setting.showRoma && line.roma ? line.roma : "",
    isBG: false,
    isDuet: false,
  };
};

const processWords = (content, lineEndTime) => {
  return content
    .filter(char => char.content?.trim())
    .map((char, wordIndex, wordArray) => ({
      word: char.content.trim(),
      startTime: char.time ?? 0,
      endTime: wordIndex === wordArray.length - 1 ? lineEndTime : (wordArray[wordIndex + 1]?.time ?? lineEndTime)
    }));
};

const processedLyrics = computed(() => {
  if (!music.getPlaySongLyric.hasYrc || !setting.showYrc) {
    // 处理普通歌词
    return music.getPlaySongLyric.lrc
      .filter(line => line.content?.length > 0)
      .map((line, index, array) => {
        const baseLine = processLyricLine(line, index, array);
        return {
          ...baseLine,
          originalLyric: line.content.map(item => item.content.trim()),
          words: processWords(line.content, baseLine.endTime),
        };
      });
  } else {
    // 处理逐字歌词
    return music.getPlaySongLyric.yrc
      .filter(line => line.content?.length > 0)
      .map((line, index, array) => {
        const baseLine = processLyricLine(line, index, array);
        const cleanContent = line.content
          .filter(char => char.content?.trim())
          .map(char => ({
            ...char,
            content: char.content.trim()
          }));

        return {
          ...baseLine,
          originalLyric: cleanContent.map(char => char.content),
          words: processWords(cleanContent, baseLine.endTime),
        };
      });
  }
});

console.log('处理后的歌词数据', processedLyrics.value);

const emit = defineEmits(["lrcTextClick"]);

const lrcTextClick = (time) => {
  emit("lrcTextClick", time);
};

// 监听歌词数据变化
watch(() => music.getPlaySongLyric, () => {
  isLyricReady.value = false;
  nextTick(() => {
    isLyricReady.value = true;
  });
}, { deep: true });

// 添加监听器以确保DOM更新后再进行尺寸测量
onMounted(() => {
  nextTick(() => {
    isLyricReady.value = true;
    if (containerRef.value) {
      const observer = new ResizeObserver(() => {
        // 当容器大小变化时，重新计算歌词尺寸
        if (music.getPlaySongLyric.lrc[0]) {
          isLyricReady.value = false;
          nextTick(() => {
            isLyricReady.value = true;
          });
        }
      });
      observer.observe(containerRef.value);
    }
  });
});

// 更新当前时间
watch(() => music.getPlaySongTime.currentTime, (newTime) => {
  currentTimeRef.value = newTime;
});

</script>

<style lang="scss">

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

  .amll-lyric-player {
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
    cursor: pointer;

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
</style>
