// 缓存正则表达式
const LRC_LINE_REGEX = /^\[([^\]]+)\]\s*(.+?)\s*$/;
const YRC_TIME_REGEX = /\[(\d+),(\d+)\]/;
const YRC_CONTENT_REGEX = /(\([1-9]\d*,[1-9]\d*,\d*\)[^\(]*)/g;
const YRC_DETAIL_REGEX = /\((\d+),(\d+),(\d+)\)/;

/**
 * 将歌词接口数据解析出对应数据
 * @param {string} data 接口数据
 * @returns {Array} 对应数据
 */
const parseLyric = (data) => {
  console.log('开始解析歌词数据:', data);
  // 判断是否具有内容
  const checkLyric = (lyric) => lyric?.lyric || false;
  
  // 初始化数据
  const { lrc, tlyric, romalrc, yrc, ytlrc, yromalrc } = data;
  const lrcData = {
    lrc: lrc?.lyric || null,
    tlyric: tlyric?.lyric || null,
    romalrc: romalrc?.lyric || null,
    yrc: yrc?.lyric || null,
    ytlrc: ytlrc?.lyric || null,
    yromalrc: yromalrc?.lyric || null,
  };

  // 初始化输出结果
  const result = {
    hasLrcTran: checkLyric(tlyric),
    hasLrcRoma: checkLyric(romalrc),
    hasYrc: checkLyric(yrc),
    hasYrcTran: checkLyric(ytlrc),
    hasYrcRoma: checkLyric(yromalrc),
    lrc: [],
    yrc: [],
  };

  console.log('歌词类型检查结果:', {
    hasLrcTran: result.hasLrcTran,
    hasLrcRoma: result.hasLrcRoma,
    hasYrc: result.hasYrc,
    hasYrcTran: result.hasYrcTran,
    hasYrcRoma: result.hasYrcRoma
  });

  // 普通歌词
  if (lrcData.lrc) {
    console.log('开始解析普通歌词');
    result.lrc = parseLrc(lrcData.lrc);
    if (result.lrc.length) {
      if (lrcData.tlyric) {
        console.log('解析普通歌词翻译');
        const tranLrc = parseLrc(lrcData.tlyric);
        if (tranLrc.length) {
          parseOtherLrc(result.lrc, tranLrc, "tran");
        }
      }
      if (lrcData.romalrc) {
        console.log('解析普通歌词音译');
        const romaLrc = parseLrc(lrcData.romalrc);
        if (romaLrc.length) {
          parseOtherLrc(result.lrc, romaLrc, "roma");
        }
      }
    }
  }

  // 逐字歌词
  if (lrcData.yrc) {
    console.log('开始解析逐字歌词');
    result.yrc = parseYrc(lrcData.yrc);
    if (result.yrc.length) {
      if (lrcData.ytlrc) {
        console.log('解析逐字歌词翻译');
        const tranYrc = parseLrc(lrcData.ytlrc);
        if (tranYrc.length) {
          parseOtherLrc(result.yrc, tranYrc, "tran");
        }
      }
      if (lrcData.yromalrc) {
        console.log('解析逐字歌词音译');
        const romaYrc = parseLrc(lrcData.yromalrc);
        if (romaYrc.length) {
          parseOtherLrc(result.yrc, romaYrc, "roma");
        }
      }
    }
  }

  console.log('歌词解析完成，结果:', result);
  return result;
};

/**
 * 翻译文本对齐
 * @param {Array} lrc 歌词数组
 * @param {Array} tranLrc 翻译歌词数组
 * @param {string} name 属性名
 */
const parseOtherLrc = (lrc, tranLrc, name) => {
  console.log(`开始对齐${name}歌词，原歌词数量:${lrc.length}，翻译数量:${tranLrc.length}`);
  const tranMap = new Map(tranLrc.map(x => [x.time, x.content]));
  
  for (const lyric of lrc) {
    const time = lyric.time;
    if (tranMap.has(time)) {
      lyric[name] = tranMap.get(time);
      continue;
    }
    
    // 查找接近的时间点
    for (const [tranTime, content] of tranMap) {
      if (Math.abs(time - tranTime) < 0.6) {
        lyric[name] = content;
        break;
      }
    }
  }
  console.log(`${name}歌词对齐完成`);
};

/**
 * 普通歌词解析
 * @param {string} lyrics 歌词字符串
 * @returns {Array} 歌词对象数组
 */
const parseLrc = (lyrics) => {
  if (!lyrics) return [];
  try {
    const lines = lyrics.split("\n");
    console.log('开始解析普通歌词，行数:', lines.length);
    const parsedLyrics = [];
    
    for (const line of lines) {
      const match = line.match(LRC_LINE_REGEX);
      if (!match) continue;
      
      const [, time, text] = match;
      const content = text.trim();
      if (!content) continue;
      
      // 检查是否为纯音乐
      if (content === "纯音乐，请欣赏") {
        console.log("该歌曲为纯音乐");
        return [];
      }
      
      const parts = time.split(":");
      const seconds = parts.length > 2
        ? Number(parts[0]) * 60 + Number(parts[1]) + Number(parts[2]) / 1000
        : Number(parts[0]) * 60 + Number(parts[1]);
        
      parsedLyrics.push({
        time: Number(seconds.toFixed(2)),
        content
      });
    }
    
    console.log('普通歌词解析完成，有效行数:', parsedLyrics.length);
    return parsedLyrics;
  } catch (err) {
    console.error("普通歌词处理出错：", err);
    return [];
  }
};

/**
 * 逐字歌词解析
 * @param {string} lyrics 逐字歌词字符串
 * @returns {Array} 歌词对象数组
 */
const parseYrc = (lyrics) => {
  if (!lyrics) return [];
  try {
    const lines = lyrics.split("\n");
    console.log('开始解析逐字歌词，行数:', lines.length);
    const parsedLyrics = [];
    
    for (const line of lines) {
      const timeMatch = line.match(YRC_TIME_REGEX);
      if (!timeMatch) continue;
      
      const [, startTime, endTime] = timeMatch;
      if (isNaN(startTime) || isNaN(endTime)) continue;
      
      const content = line.replace(YRC_TIME_REGEX, "").trim();
      if (!content) continue;
      
      const contentArray = [];
      const matches = content.match(YRC_CONTENT_REGEX);
      
      if (!matches) continue;
      
      for (const part of matches) {
        const detailMatch = part.match(YRC_DETAIL_REGEX);
        if (!detailMatch) continue;
        
        const [, time, , duration] = detailMatch;
        const text = part.replace(YRC_DETAIL_REGEX, "").trim();
        if (!text) continue;
        
        contentArray.push({
          time: Number(time) / 1000 + 0.1,
          duration: Number(duration) / 1000,
          content: text
        });
      }
      
      if (contentArray.length) {
        parsedLyrics.push({
          time: Number(startTime) / 1000,
          endTime: Number(endTime) / 1000,
          content: contentArray
        });
      }
    }
    
    console.log('逐字歌词解析完成，有效行数:', parsedLyrics.length);
    return parsedLyrics;
  } catch (err) {
    console.error("逐字歌词处理出错：", err);
    return [];
  }
};

export default parseLyric;
