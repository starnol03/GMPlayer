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
        :lyric-lines="processedLyrics" 
        :enableBlur="setting.lyricsBlur"
        :enableScale="false"
        :playing="music.getPlayState"
        :current-time="currentTimeRef | 0" 
        :line-click="e => {
          if (music.getPlayState) lrcTextClick(e.line.getLine().startTime)
        }"
        :wordFadeWidth="0.5"
        ref="playerRef"
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

const playerRef = ref();

// 初始化当前时间
currentTimeRef.value = music.getPlaySongTime.currentTime;

console.log('歌词数据', music.getPlaySongLyric);

const processLyricLine = (line, index, array) => {
  const nextLine = array[index + 1];
  return {
    startTime: line.time,
    endTime: nextLine ? nextLine.time : line.time + line.endTime,
    translatedLyric: setting.showTransl && line.tran ? line.tran : "",
    romanLyric: setting.showRoma && line.roma ? line.roma : "",
    isBG: false,
    isDuet: false,
  };
};

const processWords = (content, lineEndTime) => {
  return content
    .filter(char => char.content)  // 只过滤掉content为空的情况
    .map((char, wordIndex, wordArray) => ({
      word: char.content,  // 保留原始内容，包括空格
      startTime: char.time,
      endTime: wordIndex === wordArray.length - 1 
        ? lineEndTime  // 最后一个词使用行的结束时间
        : wordArray[wordIndex + 1].time // 否则使用下一个词的开始时间
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
          originalLyric: line.content.map(item => item.content),
          words: processWords(line.content, baseLine.endTime)
        };
      });
  } else {
    // 处理逐字歌词
    return music.getPlaySongLyric.yrc
      .filter(line => line.content?.length > 0)
      .map((line, index, array) => {
        const baseLine = processLyricLine(line, index, array);
        const cleanContent = line.content
          .filter(char => char.content)
          .map(char => ({
            ...char,
            content: char.content
          }));

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

// 监听歌词数据变化
watch(() => music.getPlaySongLyric, () => {
  isLyricReady.value = false;
  nextTick(() => {
    isLyricReady.value = true;
    nextTick(() => {
      if (playerRef.value?.lyricPlayer?.value) {
        const player = playerRef.value.lyricPlayer.value;
        // 设置弹簧参数，增加阻尼减少振动
        player.setLinePosYSpringParams({
          mass: 1,
          stiffness: 170,
          damping: 26,
          velocity: 0
        });

        player.setAlignAnchor('center');
        // 设置对齐位置
        player.setAlignPosition(0.5);
        // 设置歌词行
        player.setLyricLines(processedLyrics.value);
        // 设置当前时间
        player.setCurrentTime(currentTimeRef.value);
      }
    });
  });
}, { deep: true });

// 更新歌词行
const updateLyricLines = async () => {
  if (!playerRef.value?.lyricPlayer?.value || !music.getPlayState) return;
  
  const player = playerRef.value.lyricPlayer.value;
  // 设置弹簧参数
  player.setLinePosYSpringParams({
    mass: 1,
    stiffness: 170,
    damping: 26,
    velocity: 0
  });
  // 设置对齐方式
  player.setAlignAnchor('top');
  player.setAlignPosition(0.5);
  // 设置歌词行
  player.setLyricLines(processedLyrics.value);
  // 设置当前时间
  player.setCurrentTime(currentTimeRef.value);
};

// 更新当前时间
watch(
  () => music.getPlaySongTime.currentTime, 
  (newTime) => {
    currentTimeRef.value = newTime;
    const player = playerRef.value?.lyricPlayer?.value;
    if (player && (player.getCurrentTime() !== newTime)) {
      player.setCurrentTime(newTime);
    }
  }
);

// 添加监听器以确保DOM更新后再进行尺寸测量
onMounted(() => {
  nextTick(async () => {
    isLyricReady.value = true;
    await nextTick();
    if (music.getPlayState) {
      await updateLyricLines();
    }

    if (containerRef.value) {
      let updateTimeout;
      const observer = new ResizeObserver(() => {
        // 清除之前的超时
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }

        // 当容器大小变化时，重新计算歌词尺寸
        if (music.getPlaySongLyric.lrc[0] && music.getPlayState) {
          updateTimeout = setTimeout(async () => {
            if (playerRef.value?.lyricPlayer?.value) {
              // 等待DOM更新
              await new Promise(r => requestAnimationFrame(r));
              // 更新歌词
              await updateLyricLines();
            }
          }, 100);
        }
      });
      observer.observe(containerRef.value);

      // 清理函数
      return () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        observer.disconnect();
      };
    }
  });
});

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
