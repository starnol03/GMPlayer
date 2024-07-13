<template>
  <div class="set-player">
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.playerStyle") }}
        <span class="tip">{{ $t("setting.playerStyleTip") }}</span>
      </div>
      <n-select class="set" v-model:value="playerStyle" :options="playerStyleOptions" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.backgroundImageShow") }}
        <span class="tip">{{
          $t(`setting.backgroundImageShowTip_${backgroundImageShow}`)
          }}</span>
      </div>
      <n-select class="set" v-model:value="backgroundImageShow" :options="backgroundImageShowOptions" />
    </n-card>
    <n-card v-if="backgroundImageShow === 'eplor'" class="set-item">
      <div class="name">
        {{ $t("setting.eploryBackgroundConfig") }}
        <span class="tip">{{
          $t(`setting.eploryBackgroundConfigTip`)
          }}</span>
      </div>
      <n-button class="set" @click="isModalOn = true">配置</n-button>
      <n-modal preset="dialog" :title="t('setting.eploryBackgroundConfig')" v-model:show="isModalOn">
        <n-form style="margin-top: 1rem;">
          <n-form-item :label="t('setting.eplorySetting.fps.title')">
            <n-input-number :min="0.1" v-model:value="fps" />
            <template #feedback>
              {{ t('setting.eplorySetting.fps.tip') }}
            </template>
          </n-form-item>
          <br />
          <n-form-item :label="t('setting.eplorySetting.flowSpeed.title')">
            <n-input-number :min="0.1" v-model:value="flowSpeed" />
            <template #feedback>
              {{ t('setting.eplorySetting.flowSpeed.tip') }}
            </template>
          </n-form-item>
          <br />
          <n-form-item :label="t('setting.eplorySetting.renderScale.title')">
            <n-input-number :min="0.1" v-model:value="renderScale" />
            <template #feedback>
              {{ t('setting.eplorySetting.renderScale.tip') }}
            </template>
          </n-form-item>
          <br />
          <n-form-item :label="t('setting.eplorySetting.albumImageUrl.title')">
            <n-input v-model:value="albumImageUrl" />
            <template #feedback>
              {{ t('setting.eplorySetting.albumImageUrl.tip') }}
            </template>
          </n-form-item>
        </n-form>
      </n-modal>
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.showTransl") }}
        <span class="tip">{{ $t("setting.showTranslTip") }}</span>
      </div>
      <n-switch v-model:value="showTransl" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.showRoma") }}
        <span class="tip">{{ $t("setting.showRomaTip") }}</span>
      </div>
      <n-switch v-model:value="showRoma" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          {{ $t("setting.showYrc") }}
          <n-tag round :bordered="false" size="small" type="warning">
            {{ $t("setting.dev") }}
            <template #icon>
              <n-icon :component="Code" />
            </template>
          </n-tag>
        </div>
        <span class="tip">{{ $t("setting.showYrcTip") }}</span>
      </div>
      <n-switch v-model:value="showYrc" :round="false" />
    </n-card>
    <template v-if="showYrc">
      <n-card class="set-item">
        <div class="name">
          {{ $t("setting.showYrcAnimation") }}
          <span class="tip">{{ $t("setting.showYrcAnimationTip") }}</span>
        </div>
        <n-switch v-model:value="showYrcAnimation" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="name">
          {{ $t("setting.showYrcTransform") }}
          <span class="tip">{{ $t("setting.showYrcTransformTip") }}</span>
        </div>
        <n-switch v-model:value="showYrcTransform" :round="false" />
      </n-card>
    </template>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.countDownShow") }}
        <span class="tip">{{ $t("setting.countDownShowTip") }}</span>
      </div>
      <n-switch v-model:value="countDownShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.lrcMousePause") }}
        <span class="tip">{{ $t("setting.lrcMousePauseTip") }}</span>
      </div>
      <n-switch v-model:value="lrcMousePause" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.lyricsBlock") }}
        <span class="tip">{{ $t("setting.lyricsBlockTip") }}</span>
      </div>
      <n-select class="set" v-model:value="lyricsBlock" :options="lyricsBlockOptions" />
    </n-card>
    <n-card class="set-item" :content-style="{
      flexDirection: 'column',
      alignItems: 'flex-start',
    }">
      <div class="name">{{ $t("setting.lyricsFontSize") }}</div>
      <n-slider v-model:value="lyricsFontSize" :tooltip="false" :max="4" :min="3" :step="0.01" :marks="{
        3: t('setting.lyrics1'),
        3.6: t('setting.lyrics2'),
        4: t('setting.lyrics3'),
      }" />
      <div :class="lyricsBlur ? 'more blur' : 'more'">
        <div v-for="n in 3" :key="n" :class="n === 2 ? 'lrc on' : 'lrc'" :style="{
          margin: n === 2 ? '12px 0' : null,
          alignItems: lyricsPosition == 'center' ? 'center' : null,
          transformOrigin:
            lyricsPosition == 'center' ? 'center' : 'center left',
        }">
          <span :style="{ fontSize: lyricsFontSize + 'vh' }">这是一句歌词
          </span>
          <span :style="{ fontSize: lyricsFontSize - 0.4 + 'vh' }">This is a lyric
          </span>
        </div>
      </div>
    </n-card>
    <n-card class="set-item">
      <div class="name">{{ $t("setting.lyricsPosition") }}</div>
      <n-select class="set" v-model:value="lyricsPosition" :options="lyricsPositionOptions" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.lyricsBlur") }}
        <span class="tip">{{ $t("setting.lyricsBlurTip") }}</span>
      </div>
      <n-switch v-model:value="lyricsBlur" :round="false" />
    </n-card>
    <!-- <n-card class="set-item">
      <div class="name">
        显示音乐频谱
        <span class="tip">可能会导致一些意想不到的后果，实验性功能</span>
      </div>
      <n-switch
        v-model:value="musicFrequency"
        :round="false"
        @click="changeMusicFrequency"
      />
    </n-card> -->
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore } from "@/store";
import { useI18n } from "vue-i18n";
import { Code } from "@icon-park/vue-next";

const { t } = useI18n();

const setting = settingStore();
const {
  showTransl,
  lyricsPosition,
  playerStyle,
  fps,
  flowSpeed,
  renderScale,
  albumImageUrl,
  lyricsFontSize,
  lyricsBlock,
  lyricsBlur,
  lrcMousePause,
  showYrc,
  showRoma,
  backgroundImageShow,
  countDownShow,
  showYrcAnimation,
  showYrcTransform,
} = storeToRefs(setting);
console.log('SETTING', fps)
const isModalOn = ref(false)

// 歌词位置
const lyricsPositionOptions = [
  {
    label: t("setting.positionLeft"),
    value: "left",
  },
  {
    label: t("setting.positionCenter"),
    value: "center",
  },
];

// 歌词滚动位置
const lyricsBlockOptions = [
  {
    label: t("setting.blockStart"),
    value: "start",
  },
  {
    label: t("setting.blockCenter"),
    value: "center",
  },
];

// 播放器样式
const playerStyleOptions = [
  {
    label: t("setting.cover"),
    value: "cover",
  },
  {
    label: t("setting.record"),
    value: "record",
  },
];

// 播放背景类型
const backgroundImageShowOptions = [
  {
    label: t("setting.solid"),
    value: "solid",
  },
  {
    label: t("setting.blur"),
    value: "blur",
  },
  {
    label: t("setting.eplor"),
    value: "eplor",
  },
];

// 音乐频谱提醒
// const changeMusicFrequency = () => {
//   if (musicFrequency.value) {
//     $dialog.warning({
//       class: "s-dialog",
//       title: "实验性功能",
//       content: "确认开启音乐频谱？将在重启应用后生效",
//       positiveText: "开启",
//       negativeText: "取消",
//       onMaskClick: () => {
//         musicFrequency.value = false;
//       },
//       onPositiveClick: () => {
//         musicFrequency.value = true;
//       },
//       onNegativeClick: () => {
//         musicFrequency.value = false;
//       },
//     });
//   }
// };
</script>
