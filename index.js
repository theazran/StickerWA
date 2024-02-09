const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage,
  delay,
} = require("@whiskeysockets/baileys");
const logger = require("pino")({ level: "silent" });
const { Boom } = require("@hapi/boom");
const { Sticker, StickerTypes, extractMetadata } = require('wa-sticker-formatter');

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('BOT RUNNING! BOT by @theazran_ ')
})


async function run() {
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const client = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger,
  });

  //   connection
  client.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if (
        new Boom(lastDisconnect.error).output?.statusCode ===
        DisconnectReason.loggedOut
      ) {
        client.logout();
        console.log("Logged out...");
      } else {
        run();
      }
    } else {
      console.log("BOT Running...");
    }
  });
  //   save creds
  client.ev.on("creds.update", saveCreds);

  //   message
  client.ev.on("messages.upsert", async (msg) => {
    try {
      if (!msg.messages) return;
      const m = msg.messages[0];
      if (m.key.fromMe) return;
      var from = m.key.remoteJid;
      let type = Object.keys(m.message)[0];
      const body =
        type === "conversation"
          ? m.message.conversation
          : type == "imageMessage"
            ? m.message.imageMessage.caption
            : type == "videoMessage"
              ? m.message.videoMessage.caption
              : type == "extendedTextMessage"
                ? m.message.extendedTextMessage.text
                : type == "buttonsResponseMessage"
                  ? m.message.buttonsResponseMessage.selectedButtonId
                  : type == "listResponseMessage"
                    ? m.message.listResponseMessage.singleSelectReply.selectedRowId
                    : type == "templateButtonReplyMessage"
                      ? m.message.templateButtonReplyMessage.selectedId
                      : type === "messageContextInfo"
                        ? m.message.listResponseMessage.singleSelectReply.selectedRowId ||
                        m.message.buttonsResponseMessage.selectedButtonId ||
                        m.text
                        : "";
      const isMedia = (type === 'imageMessage' || type === 'videoMessage')
      const isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
      global.reply = async (text) => {
        await client.sendPresenceUpdate("composing", from);
        return client.sendMessage(from, { text }, { quoted: m });
      };

      client.downloadMediaMessage = downloadMediaMessage
      async function downloadMediaMessage(message) {
        let mimes = (message.msg || message).mimetype || ''
        let messageType = mimes.split('/')[0].replace('application', 'document') ? mimes.split('/')[0].replace('application', 'document') : mimes.split('/')[0]
        let extension = mimes.split('/')[1]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
      }

      if (body == 'tes') {
        await client.sendMessage(from, { text: 'halo' })
      }

      if (isMedia) {
        const message = isQuotedImage ? m.quoted : m.message.imageMessage
        const buff = await client.downloadMediaMessage(message)
        const data = new Sticker(buff, { pack: 'Follow', author: '@theazran_', type: StickerTypes.FULL, quality: 50, id: 'null' })
        await client.sendMessage(from, await data.toMessage(), { quoted: m })
      }

      // Endpoint untuk mengirim pesan
      app.get('/sendMessage', async (req, res) => {
        try {
          const from = req.query.from;
          const text = req.query.text;

          // Mengganti kode ini dengan logika pengiriman pesan sesuai dengan library/layanan yang digunakan
          const response = await client.sendMessage(from, { text });

          console.log('Pesan berhasil dikirim:', response);
          res.status(200).json({ message: 'Pesan berhasil dikirim' });
        } catch (error) {
          console.error('Terjadi kesalahan saat mengirim pesan:', error);
          res.status(500).json({ error: 'Terjadi kesalahan saat mengirim pesan' });
        }
      });

      app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
      })
    } catch (error) {
      console.log(error);
    }
  });
}


// running bot
try {
  run();
} catch (e) {
  console.log(e);
}