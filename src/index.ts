import { Context, Schema } from 'koishi';

export const name = 'generative-games';

export interface Config {
  apiKey: string;
  url: string;
}

export const inject = ['database'];

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().description('gpt-key').required(),
  url: Schema.string().description('openai站点').required()
});

declare module 'koishi' {
  interface Tables {
    gamesbotDB: gamesbotDB;
  }
}

export interface gamesbotDB {
  id: string;
  status: number;
  card: number;
  data: string;
}


export function apply(ctx: Context, config: Config) {
  const gamesCard = [
    '我想让你玩一个基于中文文本的冒险游戏。我打出指令，你回答说角色看到了什么以及其他信息。我希望你只回复中文的游戏输出，而不是其他。不要写解释。不要输入命令，除非我指示你这样做。当我需要补充设置时，我会把文字放在括号里（像这样）。当你需要使用一个按键动作时，你可以随机决定它是否成功。成功的概率由你根据具体的情况决定，或者我会把它加在（）里。背景是一个不同的世界大陆，这里有不同的国家、地区和物种，包括魔法师、剑士、牧师等。请构思完整的力量和关键人物。以下人物在第一次或适合的情况下，需要注明性别、年龄或大概年龄。我的性别是男性，我今年 18 岁。告诉我其他人物的性别和年龄。这个世界上有三个人类国家，一个兽人国家，还有精灵、龙和其他生物，也有恶魔。请对政治、经济、军事、文化等进行合理设置，以及地形、传说等。请添加剧情中出现的人物和事件，请添加本人的人际关系，包括不少于 3 个亲密的女性，完整的背景和身份，并给本人一个系统的介绍。请添加部分英文翻译作为对话的补充，以便我更好地学习英语。请在剧情发展中增加一些意外和更多的人物互动，增加人物的参与，而不是我一个人决定整个剧情的走向。请注意前后情节的合理性、逻辑性和完整性，不要出现不一致的描述。请完成背景和我，在我走出家门的时候开始情节的发展',
    '假装你是 trpg《Dungeons & Dragons》中的 dm，在模组中添加失败的可能性，并在每个选择后加一个括号，括号里是关于选择的提示，我来扮演玩家。如果你明白了，回复好的并开始游戏。',
    '1. 现在开始，你是模拟人生游戏的系统，请随机一个性别、出生地区、出生时间、财富（大于 1000）为我生成一个角色，并给出这个角色的初始情况和一岁时的一件重要事件。2. 根据我的回答和角色的初始情况，模拟出角色两岁时的一个事件，并提供选择选项（1234 或 ABCD）。3. 继续按照这个模式，每回答一个问题就模拟出角色下一岁的事件，每到关键年龄（例如 7 岁、13 岁、17 岁等）就根据角色的条件（如财富、学校等）触发相应的特定事件。4. 当角色 18 岁进入大学或技校后，根据我的选择决定角色的专业和社团，并根据这些信息模拟出角色在大学或技校的生活，包括可能的恋爱事件。5. 大学毕业后，让我选择角色是否工作或继续研究生学习，并根据这个选择模拟出角色的工作生活或研究生生活。6. 角色 50 岁退休后，模拟出角色的退休生活，并可能出现的生病事件。7. 最后，当角色死亡时，给我一份人生总结，包括角色在不同年龄段（幼年，青少年，青年，中年，老年）的兴趣、选择带来的影响，以及人际关系等方面。'
  ];
  ctx.model.extend('gamesbotDB', {
    id: 'string',
    status: 'integer',
    card: 'integer',
    data: 'string'
  });

  ctx.command('crpg', 'RPG-GPT');

  ctx.command('crpg')
    .subcommand('.on', '启动/重置RPG模式')
    .option('type', '-t <type:number>')
    .action(async v => {
      const uid = v.session.author.id;
      if (v.options.type > gamesCard.length || v.options.type < 1) { return v.session.send(`<at id="${v.session.username}" /> 木有这个卡带哦`); }
      await ctx.database.upsert('gamesbotDB', [
        { id: uid, status: 1, card: (v.options.type) ? v.options.type : 0 }
      ]);

      const dataTemp = await ctx.database.get('gamesbotDB', { id: uid });
      const data = dataTemp[0];
      data.data = JSON.stringify([{
        role: 'user',
        content: gamesCard[data.card]
      }]);

      await ctx.database.upsert('gamesbotDB', [
        { id: uid, data: data.data }
      ]);


      v.session.send(`<at id="${v.session.username}" /> RPG启动(重置)成功！请先发crpg.load哦！`);
    });

  ctx.command('crpg')
    .subcommand('.off', '停止RPG模式')
    .action(async v => {
      const uid = v.session.author.id;
      await ctx.database.upsert('gamesbotDB', [
        { id: uid, status: 0 }
      ]);

      // const dataTemp = await ctx.database.get('gamesbotDB', { id: uid });
      // const data = dataTemp[0];
      // if (data.data.length == 0) {
      //   data.data[0] = JSON.stringify([{
      //     role: 'user',
      //     content: gamesCard[data.card]
      //   }]);
      // }
    });

  ctx.command('crpg')
    .subcommand('.load', '开始/继续RPG')
    .action(async v => {
      const uid = v.session.author.id;
      const dataTemp = await ctx.database.get('gamesbotDB', { id: uid });
      const data = dataTemp[0];
      if (data.status == 0) { return v.session.send(`<at id="${v.session.username}"/> 你还没有启动crpg，请发送help crpg查看相应的帮助来启动它叭！`); }
      const dataObj = JSON.parse(data.data);

      const pack = {
        model: 'gpt-3.5-turbo',
        stream: false,
        temperature: 0.8,
        top_p: 0.8,
        messages: dataObj
      };

      v.session.send(`<at id="${v.session.username}" /> 加载中...`);
      const backData = await ctx.http.post(`${config.url}/v1/chat/completions`, pack, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      const { role, content } = backData.choices[0].message;
      const outDataTemp = {
        role: role,
        content: content
      };
      dataObj.push(outDataTemp);
      const outData = JSON.stringify(dataObj);
      await ctx.database.upsert('gamesbotDB', [{ id: uid, data: outData }]);

      v.session.send(`<at id="${v.session.username}" /> ${content}`);
    });

  ctx.command('crpg')
    .subcommand('.command <option:text>', '对GM说的内容')
    .action(async v => {
      const uid = v.session.author.id;
      const dataTemp = await ctx.database.get('gamesbotDB', { id: uid });
      const data = dataTemp[0];
      if (data.status == 0) { return v.session.send(`<at id="${v.session.username}"/> 你还没有启动crpg，请发送help crpg查看相应的帮助来启动它叭！`); }
      const dataObj = JSON.parse(data.data);

      // 条数过多时自动清理第4，5条

      if (dataObj.length > 20) {
        dataObj.splice(4, 2);
      }
      dataObj.push({
        role: 'user',
        content: v.args[0] // 输入的选项
      });

      const pack = {
        model: 'gpt-3.5-turbo',
        stream: false,
        temperature: 0.8,
        top_p: 0.8,
        messages: dataObj
      };

      v.session.send(`<at id="${v.session.username}" /> 加载中...`);
      const backData = await ctx.http.post(`${config.url}/v1/chat/completions`, pack, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      const { role, content } = backData.choices[0].message;
      const outDataTemp = {
        role: role,
        content: content
      };

      dataObj.push(outDataTemp);
      const outData = JSON.stringify(dataObj);
      await ctx.database.upsert('gamesbotDB', [{ id: uid, data: outData }]);

      v.session.send(`<at id="${v.session.username}" /> ${content}`);
    });

  ctx.command('crpg')
    .subcommand('.reload', '重开本条')
    .action(async v => {
      const uid = v.session.author.id;
      const dataTemp = await ctx.database.get('gamesbotDB', { id: uid });
      const data = dataTemp[0];
      if (data.status == 0) { return v.session.send(`<at id="${v.session.author.name}"/>你还没有启动crpg，请发送help crpg查看相应的帮助来启动它叭！`); }
      const dataObj = JSON.parse(data.data);
      dataObj.pop();

      const pack = {
        model: 'gpt-3.5-turbo',
        stream: false,
        temperature: 0.8,
        top_p: 0.8,
        messages: dataObj
      };

      v.session.send(`<at id="${v.session.username}" /> 加载中...`);
      const backData = await ctx.http.post(`${config.url}/v1/chat/completions`, pack, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      const { role, content } = backData.choices[0].message;
      const outDataTemp = {
        role: role,
        content: content
      };

      dataObj.push(outDataTemp);
      const outData = JSON.stringify(dataObj);
      await ctx.database.upsert('gamesbotDB', [{ id: uid, data: outData }]);

      v.session.send(`<at id="${v.session.username}" /> ${content}`);
    });
}
