<template>
  <!-- 滚动歌词 -->
  <div v-if="music.getPlaySongLyric.lrc[0]" :class="[
    setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
    setting.lyricsBlock === 'center' ? 'center' : 'top',
    music.getLoadingState ? 'loading' : ''
  ]" ref="lrcAllContainer">
    <div class="placeholder" :id="!music.getPlaySongLyric.hasYrc || !setting.showYrc ? 'lrc-1' : 'yrc-1'
      " :style="setting.lyricsPosition === 'center'
        ? { justifyContent: 'center', padding: '0' }
        : null
        ">
      <CountDown v-if="setting.countDownShow" :style="{ fontSize: setting.lyricsFontSize + 'vh' }" />
    </div>
    <!-- 普通歌词 -->
    <template v-if="!music.getPlaySongLyric.hasYrc || !setting.showYrc">
      <div class="lrc" v-for="(item, index) in music.getPlaySongLyric.lrc" :class="{
        on: music.getPlaySongLyricIndex == index,
        down: music.getPlaySongLyricIndex !== 0 && music.getPlaySongLyricIndex == index - 1,
        up: music.getPlaySongLyricIndex !== 0 && music.getPlaySongLyricIndex == index + 1,
        blur: setting.lyricsBlur,
      }" :style="{
        marginBottom: setting.lyricsFontSize - 1.6 + 'vh',
        transformOrigin:
          setting.lyricsPosition === 'center' ? 'center' : null,
        filter: setting.lyricsBlur
          ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)`
          : 'none',
        alignItems:
          setting.lyricsPosition === 'center' ? 'center' : 'flex-start',
      }" :key="item" :id="'lrc' + index" @click="lrcTextClick(item.time)">
        <span class="lyric" :style="{ fontSize: setting.lyricsFontSize + 'vh' }">
          {{ item.content }}
        </span>
        <span v-if="
          music.getPlaySongLyric.hasLrcTran && setting.showTransl && item.tran && !(reg.test(item.tran)) // 排除为时间轨道
        " :style="{ fontSize: setting.lyricsFontSize - 1 + 'vh' }" class="lyric-fy">
          {{ item.tran }}</span>
        <span v-if="
          music.getPlaySongLyric.hasLrcRoma && setting.showRoma && item.roma && !(reg.test(item.roma))
        " :style="{ fontSize: setting.lyricsFontSize - 1.5 + 'vh' }" class="lyric-roma">
          {{ item.roma }}</span>
      </div>
    </template>
    <!-- 逐字歌词 -->
    <template v-else>
    </template>
    <div class="placeholder" />
  </div>
</template>

<script setup>
import { musicStore, settingStore } from "@/store";
import CountDown from "./CountDown.vue";

const music = musicStore();
const setting = settingStore();
const reg = /^\[\d{2}:\d{2}\.\d{3}\]$/

console.log('歌词数据', music.getPlaySongLyric)

// 发送方法
const emit = defineEmits(["lrcTextClick"]);

// 歌词模糊数值
const getFilter = (lrcIndex, index) => {
  if (lrcIndex >= index) {
    return lrcIndex - index;
  } else {
    return index - lrcIndex;
  }
};

// 歌词文本点击
const lrcTextClick = (time) => {
  emit("lrcTextClick", time);
};

// 原生 DOM 的逐字歌词实现
function renderLyricsTemplate(music, setting) {
  const lrcAllContainer = document.querySelector('.lrc-all');
  
  // Exit early if no lyrics data or container found
  if (!music.getPlaySongLyric || !lrcAllContainer) {
    return;
  }

  // Iterate through each lyric item
  music.getPlaySongLyric.yrc.forEach((item, index) => {
    // Create a new div element for each lyric item
    const lyricItem = document.createElement('div');
    lyricItem.className = 'yrc';
    lyricItem.id = `yrc${index}`;

    // Add dynamic classes based on current playing state and settings
    lyricItem.classList.toggle('on', music.getPlaySongLyricIndex === index);
    lyricItem.classList.toggle('down', music.getPlaySongLyricIndex !== 0 && music.getPlaySongLyricIndex === index - 1);
    lyricItem.classList.toggle('up', music.getPlaySongLyricIndex !== 0 && music.getPlaySongLyricIndex === index + 1);
    lyricItem.classList.toggle('blur', setting.lyricsBlur);

    // Apply dynamic styles based on settings
    lyricItem.style.marginBottom = `${setting.lyricsFontSize - 1.6}vh`;
    lyricItem.style.transformOrigin = setting.lyricsPosition === 'center' ? 'center' : null;
    lyricItem.style.filter = setting.lyricsBlur ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)` : 'none';
    lyricItem.style.alignItems = setting.lyricsPosition === 'center' ? 'center' : 'flex-start';

    // Handle click event on lyric item
    lyricItem.onclick = () => lrcTextClick(item.time);

    // Create a div for the main lyric content
    const lyricContent = document.createElement('div');
    lyricContent.className = 'lyric';
    lyricContent.style.fontSize = `${setting.lyricsFontSize}vh`;

    // Iterate through each line of content in the lyric item
    item.content.forEach((v, i) => {
      // Create a div for each line of text
      const textDiv = document.createElement('div');
      textDiv.className = 'text';
      textDiv.style.setProperty('--dur', `${Math.max(v.duration - 0.2, 0.1)}s`);

      // Create spans for the main text and filler text
      const textSpan1 = document.createElement('span');
      textSpan1.className = 'word';
      textSpan1.innerHTML = v.content.replace(/ /g, '&nbsp;');

      const textSpan2 = document.createElement('span');
      textSpan2.className = 'filler';
      textSpan2.innerHTML = v.content.replace(/ /g, '&nbsp;');
      textSpan2.setAttribute('data-updated', 'false');

      // Add 'fill' class conditionally based on current playing time
      if (music.getPlaySongLyricIndex === index && music.getPlaySongTime.currentTime + 0.2 >= v.time) {
        textDiv.classList.add('fill');
      }

      // Apply transform style based on setting
      textDiv.style.transform = setting.showYrcTransform ? 'translateY(-50%)' : 'none';

      // Append spans to text div
      textDiv.appendChild(textSpan1);
      textDiv.appendChild(textSpan2);

      // Append text div to main lyric content div
      lyricContent.appendChild(textDiv);
    });

    // Append lyric content div to lyric item
    lyricItem.appendChild(lyricContent);

    // Append translation span if translation exists and setting is enabled
    if (music.getPlaySongLyric.hasYrcTran && setting.showTransl && item.tran) {
      const translationSpan = document.createElement('span');
      translationSpan.className = 'lyric-fy';
      translationSpan.style.fontSize = `${setting.lyricsFontSize - 1}vh`;
      translationSpan.innerHTML = item.tran;
      lyricItem.appendChild(translationSpan);
    }

    // Append romanization span if romanization exists and setting is enabled
    if (music.getPlaySongLyric.hasYrcRoma && setting.showRoma && item.roma) {
      const romanizationSpan = document.createElement('span');
      romanizationSpan.className = 'lyric-roma';
      romanizationSpan.style.fontSize = `${setting.lyricsFontSize - 1.5}vh`;
      romanizationSpan.innerHTML = item.roma;
      lyricItem.appendChild(romanizationSpan);
    }

    // Append the completed lyric item to the main container
    lrcAllContainer.appendChild(lyricItem);
  });
}

function updateLyricsDisplay(music) {
  const currentIndex = music.getPlaySongLyricIndex;

  const lyricItems = document.querySelectorAll('.yrc');

  lyricItems.forEach((lyricItem, index) => {
    const item = music.getPlaySongLyric.yrc[index];
    const content = item.content;

    // Update yrc container classes
    lyricItem.classList.toggle('on', currentIndex === index);
    lyricItem.classList.toggle('down', currentIndex !== 0 && currentIndex === index - 1);
    lyricItem.classList.toggle('up', currentIndex !== 0 && currentIndex === index + 1);

    content.forEach((v, i) => {
      const textDiv = lyricItem.querySelectorAll('.text')[i];
      const textSpan2 = lyricItem.querySelectorAll('.filler')[i];

      // Check if filler text has been updated before
      if (textSpan2.getAttribute('data-updated') === 'false') {
        // Update filler text
        textSpan2.innerHTML = v.content.replace(/ /g, '&nbsp;');
        textSpan2.setAttribute('data-updated', 'true');
      }

      // Update filler text opacity based on current time
      if (music.getPlaySongTime.currentTime >= v.time && music.getPlaySongTime.currentTime <= v.time + v.duration) {
        textSpan2.style.opacity = 1;
      } else {
        textSpan2.style.opacity = 0;
      }

      if (currentIndex === index && music.getPlaySongTime.currentTime + 0.2 >= v.time) {
        textDiv.classList.add('fill');
      } else {
        textDiv.classList.remove('fill');
      }
    });
  });
}

// Example: Update display every 100ms based on music playback time
setInterval(() => {
  updateLyricsDisplay(music);
}, 100);

onMounted(() => {
  renderLyricsTemplate(music, setting);
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
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.3;
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

  25% {
    text-shadow: 0 0 0.3em rgba(255, 255, 255, 0.5);
  }

  50% {
    text-shadow: 0 0 0.5em rgba(255, 255, 255, 0.7);
  }

  75% {
    text-shadow: 0 0 0.3em rgba(255, 255, 255, 0.5);
  }

  100% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
}
</style>
