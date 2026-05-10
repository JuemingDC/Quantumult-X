/***************************************
 *
 * 百度网盘 - 金刚区过滤
 * 作用：
 * 移除 novel / shortplay / print / job_hunt 类型入口
 *
 ***************************************/

let body = $response.body;

try {
  let obj = JSON.parse(body);

  if (
    obj &&
    obj.data &&
    Array.isArray(obj.data.data)
  ) {
    const blockTypes = new Set([
      "novel",
      "shortplay",
      "print",
      "job_hunt"
    ]);

    obj.data.data = obj.data.data.filter(item => {
      return !blockTypes.has(item?.type);
    });
  }

  body = JSON.stringify(obj);
} catch (e) {
  console.log("BaiduNetDisk_KingKong.js error: " + e);
}

$done({ body });
