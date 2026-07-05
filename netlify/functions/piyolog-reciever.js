exports.handler = async (event) => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  const typeLabelMap = {
    Pee: "おしっこ", Poop: "うんち", Formula: "ミルク",
    BreastMilk: "母乳", Sleep: "寝る", WakeUp: "起きる"
  };
  const pad = (n) => String(n).padStart(2, "0");

  try {
    const data = JSON.parse(event.body);

    // すべてのイベントを1次元配列にまとめる
    const tasks = [];
    for (const day of data.days) {
      const { year, month, day: d } = day.date;
      for (const ev of day.events) {
        tasks.push({ year, month, d, ev });
      }
    }

    // Notion APIのレート制限(3req/秒)を考慮し、3件ずつまとめて並列実行
    const chunkSize = 3;
    let createdCount = 0;

    for (let i = 0; i < tasks.length; i += chunkSize) {
      const chunk = tasks.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(({ year, month, d, ev }) => {
        const isoDateTime = `${year}-${pad(month)}-${pad(d)}T${pad(ev.hour)}:${pad(ev.minute)}:00+09:00`;
        const typeLabel = typeLabelMap[ev.type] || ev.type;
        const amount = ev.value ? ev.value.value : null;
        const title = amount ? `${typeLabel} ${amount}${ev.value.unit}` : typeLabel;

        const properties = {
          "名前": { title: [{ text: { content: title } }] },
          "種類": { select: { name: typeLabel } },
          "日時": { date: { start: isoDateTime } }
        };
        if (amount !== null) properties["量"] = { number: amount };

        return fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties })
        });
      }));

      createdCount += results.filter(r => r.ok).length;
    }

    return { statusCode: 200, body: JSON.stringify({ status: "ok", created: createdCount }) };

  } catch (error) {
    console.log("ERROR:", error.message);
    return { statusCode: 500, body: JSON.stringify({ status: "error", message: error.message }) };
  }
};
