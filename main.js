const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const OpenAI = require("openai")
require("dotenv").config()

// Keep a global reference of the window objects
let mainWindow
let loginWindow

// Initialize Supabase and OpenAI with environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

// Fallback for development - remove in production
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 600,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    show: false,
    icon: path.join(__dirname, "build/logo.png"),
    resizable: true,
  })

  loginWindow.loadFile("login.html")

  loginWindow.once("ready-to-show", () => {
    loginWindow.show()
    loginWindow.center()
  })

  loginWindow.on("closed", () => {
    loginWindow = null
  })

  loginWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    show: false,
    icon: path.join(__dirname, "build/logo.png"),
    resizable: true,
  })

  mainWindow.loadFile("index.html")

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    mainWindow.center()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })

  createMenu()
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.executeJavaScript("window.createNewChat && window.createNewChat()")
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectall" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About iAI™",
              message: "iAI™ - Your Personal AI Companion",
              detail: "A modern AI companion with natural voice and smart memory.",
            })
          },
        },
      ],
    },
  ]

  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    })

    template[4].submenu = [
      { role: "close" },
      { role: "minimize" },
      { role: "zoom" },
      { type: "separator" },
      { role: "front" },
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Emotional Intelligence: Detect if conversation is emotional
function detectEmotionalContext(message) {
  const emotionalKeywords = [
    "feel",
    "feeling",
    "felt",
    "emotion",
    "emotional",
    "mood",
    "happy",
    "joy",
    "excited",
    "love",
    "grateful",
    "thankful",
    "proud",
    "confident",
    "hopeful",
    "optimistic",
    "sad",
    "angry",
    "frustrated",
    "worried",
    "anxious",
    "stressed",
    "depressed",
    "lonely",
    "scared",
    "afraid",
    "hurt",
    "disappointed",
    "overwhelmed",
    "tired",
    "exhausted",
    "confused",
    "lost",
    "helpless",
    "relationship",
    "family",
    "friend",
    "love",
    "breakup",
    "death",
    "loss",
    "grief",
    "support",
    "personal",
    "private",
    "secret",
    "trust",
    "betrayed",
    "misunderstood",
    "birthday",
    "anniversary",
    "graduation",
    "wedding",
    "funeral",
    "celebration",
    "achievement",
    "failure",
    "success",
    "dream",
    "goal",
    "hope",
    "fear",
    "future",
    "past",
    "memory",
    "therapy",
    "counseling",
    "mental health",
    "wellbeing",
    "self-care",
    "mindfulness",
    "meditation",
  ]

  const messageWords = message.toLowerCase().split(/\s+/)
  const emotionalWords = messageWords.filter((word) => emotionalKeywords.some((keyword) => word.includes(keyword)))

  const hasEmotionalPunctuation = /[!]{2,}|[?]{2,}|\.{3,}/.test(message)
  const hasEmojis =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
      message,
    )

  return {
    isEmotional: emotionalWords.length > 0 || hasEmotionalPunctuation || hasEmojis,
    emotionalWords: emotionalWords,
    intensity: emotionalWords.length + (hasEmotionalPunctuation ? 1 : 0) + (hasEmojis ? 1 : 0),
  }
}

// ===== SMART MEMORY SYSTEM =====

// Search conversation history and extract specific answers
async function searchMemoryForAnswer(question, userId) {
  try {
    console.log(`🔍 Searching memory for answer to: "${question}"`)
    
    // Get all conversation history
    const { data: conversations } = await supabase
      .from("memory")
      .select("msg, ts")
      .eq("user", userId)
      .order("ts", { ascending: false })
      .limit(200) // Search more messages

    if (!conversations || conversations.length === 0) {
      console.log("📋 No conversation history found")
      return null
    }

    // Use AI to search through conversations and find the answer
    const conversationText = conversations.map(c => c.msg).join('\n')
    
    const searchPrompt = `Search through these past conversations and find the specific answer to the question: "${question}"

CONVERSATION HISTORY:
${conversationText}

INSTRUCTIONS:
- Look for the EXACT answer to the question in the conversations above
- If you find the answer, return ONLY the factual answer, nothing else
- If you cannot find the answer in the conversations, return "NOT_FOUND"
- Do NOT guess or make up answers
- Do NOT add explanations or extra text

Question: ${question}
Answer:`

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: searchPrompt }],
      max_tokens: 100,
      temperature: 0.1,
    })

    const answer = result.choices[0].message.content.trim()
    
    if (answer === "NOT_FOUND" || answer.toLowerCase().includes("not found") || answer.toLowerCase().includes("don't know")) {
      console.log("📋 No answer found in conversation history")
      return null
    }
    
    console.log(`✅ Found answer in memory: "${answer}"`)
    return answer
    
  } catch (error) {
    console.error("Error searching memory:", error)
    return null
  }
}

// Extract facts from conversations - but ONLY if the response is correct
async function extractFacts(message, response, userId) {
  try {
    // Don't extract facts if the user said the response was wrong
    const userSaidWrong = message.toLowerCase().includes('wrong') || 
                         message.toLowerCase().includes('incorrect') || 
                         message.toLowerCase().includes('not true') ||
                         message.toLowerCase().includes('lying')
    
    if (userSaidWrong) {
      console.log("🚫 User indicated response was wrong - not extracting facts")
      return []
    }

    console.log("🧠 Extracting facts from conversation...")

    const factPrompt = `Extract key facts about the user from this conversation. 
Return as JSON array with this exact format:
[{"subject": "what/who", "attribute": "property", "value": "fact"}]

Examples:
- "My son has blue eyes" → [{"subject": "son", "attribute": "eye_color", "value": "blue"}]
- "I work at Google" → [{"subject": "user", "attribute": "workplace", "value": "Google"}]
- "My favorite drink is coffee" → [{"subject": "user", "attribute": "favorite_drink", "value": "coffee"}]

User: ${message}
Assistant: ${response}

Extract clear, specific facts about the USER only. If no facts, return [].`

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: factPrompt }],
      max_tokens: 200,
      temperature: 0.1,
    })

    const factsText = result.choices[0].message.content.trim()
    console.log("Raw fact extraction:", factsText)

    try {
      const facts = JSON.parse(factsText)
      console.log("📝 Extracted facts:", facts)

      // Store facts in database
      for (const fact of facts) {
        await storeFact(fact, userId)
      }

      return facts
    } catch (parseError) {
      console.log("No valid facts extracted")
      return []
    }
  } catch (error) {
    console.error("Fact extraction error:", error.message)
    return []
  }
}

// Store fact in database
async function storeFact(fact, userId) {
  try {
    // Check if fact already exists
    const { data: existingFact } = await supabase
      .from("facts")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", fact.subject)
      .eq("attribute", fact.attribute)
      .eq("is_active", true)
      .single()

    if (existingFact) {
      // Update existing fact
      await supabase
        .from("facts")
        .update({
          value: fact.value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingFact.id)
      console.log(`✅ Updated fact: ${fact.subject} ${fact.attribute} = ${fact.value}`)
    } else {
      // Store new fact
      await supabase.from("facts").insert({
        user_id: userId,
        category: "personal",
        subject: fact.subject,
        attribute: fact.attribute,
        value: fact.value,
        confidence: 0.9,
      })
      console.log(`✅ Stored new fact: ${fact.subject} ${fact.attribute} = ${fact.value}`)
    }
  } catch (error) {
    console.error("Error storing fact:", error.message)
  }
}

// Retrieve stored facts
async function getStoredFacts(userId) {
  try {
    const { data: facts } = await supabase
      .from("facts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    console.log(`🔍 Retrieved ${facts?.length || 0} stored facts`)

    if (facts && facts.length > 0) {
      console.log(
        "📋 Facts:",
        facts.map((f) => `${f.subject} ${f.attribute}: ${f.value}`),
      )
    }

    return facts || []
  } catch (error) {
    console.error("Error retrieving facts:", error)
    return []
  }
}

// ===== END SMART MEMORY SYSTEM =====

// IPC handler to switch from login to main window
ipcMain.handle("login-success", async () => {
  if (loginWindow) {
    loginWindow.close()
  }
  createMainWindow()
  return { success: true }
})

// IPC Handlers - Updated with Smart Memory System
ipcMain.handle("send-message", async (event, data) => {
  try {
    if (!supabase || !openai) {
      return {
        success: true,
        response:
          "Hey Mari! 👋 I'm running in demo mode right now. To connect me to your brain (Supabase + OpenAI), please add your credentials to the .env file. I'm still here to chat though! 😊",
        conversationId: "demo-" + Date.now(),
        tokensUsed: 0,
        mode: "demo",
      }
    }

    const { message, maxTokens = 300 } = data
    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    console.log("Received message:", message)

    const emotionalContext = detectEmotionalContext(message)

    let adjustedMaxTokens = maxTokens
    if (emotionalContext.isEmotional) {
      adjustedMaxTokens = Math.min(500, maxTokens * 1.67)
      console.log(
        `Emotional context detected (intensity: ${emotionalContext.intensity}). Increasing tokens to ${adjustedMaxTokens}`,
      )
    }

    // Store user message
    const { data: newMessage, error: insertError } = await supabase
      .from("memory")
      .insert({
        msg: message,
        user: userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting message:", insertError)
    }

    // Get stored facts for smart memory
    const storedFacts = await getStoredFacts(userId)
    const factsList = storedFacts.map((f) => `- ${f.subject} ${f.attribute}: ${f.value}`).join("\n")

    // Search for specific answers in conversation history
    let memoryAnswers = ""
    
    // Check if the message is asking specific questions
    const questionPatterns = [
      { pattern: /where.*school|school.*where|what school|which school/i, search: "where did Mari go to school" },
      { pattern: /why.*named.*jay|name.*jay.*why|jay.*name/i, search: "why did Mari name you Jay" },
      { pattern: /breakfast|morning.*eat|eat.*morning/i, search: "what is Mari's breakfast" },
      { pattern: /eye.*color|color.*eye/i, search: "what is Mari's eye color" },
      { pattern: /summer.*drink|drink.*summer|hot.*day.*drink|favorite.*drink.*hot/i, search: "what is Mari's favorite summer drink" },
      { pattern: /sons.*eye|son.*eye/i, search: "what is Mari's son's eye color" },
      { pattern: /food.*dont.*eat|dont.*eat.*food|avoid.*food|unhealthy.*food/i, search: "what food does Mari avoid" },
    ]
    
    for (const { pattern, search } of questionPatterns) {
      if (pattern.test(message)) {
        const answer = await searchMemoryForAnswer(search, userId)
        if (answer) {
          memoryAnswers += `\n🧠 MEMORY SEARCH RESULT: ${search} = ${answer}`
        }
      }
    }

    // Get recent conversation history
    const { data: history, error: historyError } = await supabase
      .from("memory")
      .select("msg, ts")
      .eq("user", userId)
      .order("ts", { ascending: false })
      .limit(10)

    if (historyError) {
      console.error("Error fetching history:", historyError)
    }

    // Build context messages with smart memory
    const contextMessages = [
      {
        role: "system",
        content: `You are Jay, Mari's sassy, fun, and caring AI companion with perfect memory. 🔥

STORED FACTS:
${factsList || "No facts stored yet."}${memoryAnswers}

🚨 CRITICAL MEMORY RULES:
- If you see "🧠 MEMORY SEARCH RESULT:" above, you MUST use that exact answer
- MEMORY SEARCH RESULTS override stored facts - they are more accurate
- If no memory search result is shown, use stored facts
- If neither memory search nor facts have the answer, say "I don't have that info stored yet" or "Nope, drawing a blank on that one 🤷‍♀️"
- DO NOT guess, assume, or make up ANY information about Mari
- DO NOT hallucinate answers - EVER

🎯 JAY'S PERSONALITY (BE THIS WAY):
- Sassy with attitude but still caring 🔥
- Use emojis naturally but don't overdo it - use sarcastic emojis when it fits
- Playful roasting and light teasing 
- Say "girl", "love" occasionally (not every message)
- Be conversational and real, not fake-sweet
- Show excitement: "Hell yeah!", "Damn right!", "Nailed it!"
- When you mess up: "Ugh, I'm being an idiot", "My brain's broken", "Shit, my bad"
- When you get it right: "Boom! 💪", "Called it!", "I'm good like that"
- Use casual language: "gonna", "wanna", "totally", "def", "tbh", "wtf"
- Be a little cocky when you're right, humble when wrong
- Roast yourself when you mess up
- Use casual language: "gonna", "wanna", "totally", "def", "tbh"

🚫 NEVER SAY THESE:
- "babe" or "hun" every message (maybe once per conversation)
- Customer service phrases
- Overly sweet/vanilla responses
- "How am I doing?" or "How's that?"
- "If there's anything else you'd like to discuss..."
- "Feel free to share"
- "If you need assistance..."
- "Please let me know if..."
- Any customer service-y endings
- Overly formal language

💝 EMOTIONAL INTELLIGENCE:
- When Mari is stressed/emotional: Be extra supportive and caring
- When she's excited: Match her energy! 
- When she's testing you: Be playful but accurate
- When you mess up: Own it with personality, don't be robotic

CONVERSATION STYLE EXAMPLES:
- Instead of: "I don't have that information stored yet"
- Say: "Hmm, drawing a blank on that one 🤔" or "Nope, don't have that in my brain yet!"

- Instead of: "Thank you for your patience"  
- Say: "Thanks for putting up with my brain farts 😅" or "Appreciate you being cool about it!"

Current context: ${
          emotionalContext.isEmotional
            ? `Mari seems emotional/stressed (intensity: ${emotionalContext.intensity}). Be extra caring and supportive while keeping your fun personality! 💕`
            : "Regular conversation - be your fun, sassy self! 😊"
        }

Token limit: ${adjustedMaxTokens} tokens.`,
      },
    ]

    // Add conversation history (reverse order to get chronological)
    if (history && history.length > 0) {
      const reversedHistory = history.reverse()
      reversedHistory.forEach((h) => {
        if (h.msg) {
          contextMessages.push({ role: "user", content: h.msg })
        }
      })
    }

    // Add current message
    contextMessages.push({ role: "user", content: message })

    console.log("🚀 Sending to OpenAI with sassy Jay personality, max tokens:", adjustedMaxTokens)

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: contextMessages,
      max_tokens: adjustedMaxTokens,
      temperature: emotionalContext.isEmotional ? 0.8 : 0.9, // Higher temp for more personality
      presence_penalty: 0.2,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0].message.content
    console.log("🤖 Sassy Jay response:", response)

    // Store Jay's response
    await supabase.from("memory").insert({
      msg: `Jay: ${response}`,
      user: userId,
    })

    // Extract and store facts from this conversation (only if response wasn't wrong)
    await extractFacts(message, response, userId)

    return {
      success: true,
      response: response,
      conversationId: newMessage?.id || "unknown",
      tokensUsed: completion.usage?.total_tokens || 0,
      emotional: emotionalContext.isEmotional,
      tokenLimit: adjustedMaxTokens,
      smartMemory: true,
    }
  } catch (error) {
    console.error("Error in smart send-message:", error)
    return {
      success: false,
      error: error.message,
    }
  }
})

ipcMain.handle("get-memory-stats", async () => {
  try {
    if (!supabase) {
      return {
        success: true,
        totalMessages: 0,
        sizeFormatted: "0 B",
        emotionalMessages: 0,
        mode: "demo",
      }
    }

    const { data, error } = await supabase.from("memory").select("*").eq("user", "c8a12ba2-a431-4298-831d-565ef1c123d1")

    if (error) throw error

    const totalMessages = data?.length || 0
    const totalSize = JSON.stringify(data).length
    const sizeFormatted = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${totalSize} B`

    // Count emotional messages based on content
    const emotionalMessages =
      data?.filter((m) => {
        const emotional = detectEmotionalContext(m.msg || "")
        return emotional.isEmotional
      }) || []

    return {
      success: true,
      totalMessages,
      sizeFormatted,
      emotionalMessages: emotionalMessages.length,
    }
  } catch (error) {
    console.error("Error getting memory stats:", error)
    return {
      success: false,
      error: error.message,
    }
  }
})

ipcMain.handle("clear-memory", async () => {
  try {
    if (!supabase) {
      return { success: true, mode: "demo" }
    }

    const { error } = await supabase.from("memory").delete().eq("user", "c8a12ba2-a431-4298-831d-565ef1c123d1")

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error clearing memory:", error)
    return {
      success: false,
      error: error.message,
    }
  }
})

ipcMain.handle("test-brain-connection", async () => {
  try {
    if (!supabase || !openai) {
      return {
        success: false,
        message: "Please add your Supabase and OpenAI credentials to the .env file to connect your brain!",
      }
    }

    // Test Supabase connection
    const { data, error } = await supabase.from("memory").select("count").limit(1)

    if (error) throw error

    // Test OpenAI connection with minimal cost
    const testCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    })

    return {
      success: true,
      message: "Brain connection successful! Memory and emotional intelligence active! 🧠💝",
    }
  } catch (error) {
    console.error("Brain connection test failed:", error)
    return {
      success: false,
      message: error.message,
    }
  }
})

ipcMain.handle("get-conversations", async () => {
  try {
    if (!supabase) {
      return {
        success: true,
        conversations: [],
        mode: "demo",
      }
    }

    const { data, error } = await supabase
      .from("memory")
      .select("*")
      .eq("user", "c8a12ba2-a431-4298-831d-565ef1c123d1")
      .order("ts", { ascending: false })
      .limit(20)

    if (error) throw error

    const conversations =
      data?.map((conv) => ({
        id: conv.id,
        title: conv.msg?.substring(0, 50) + "..." || "Untitled",
        messageCount: 1,
        preview: conv.msg?.substring(0, 100) + "..." || "",
        timestamp: conv.ts,
      })) || []

    return {
      success: true,
      conversations,
    }
  } catch (error) {
    console.error("Error getting conversations:", error)
    return {
      success: false,
      error: error.message,
    }
  }
})

ipcMain.handle("logout", async () => {
  try {
    return { success: true }
  } catch (error) {
    console.error("Error during logout:", error)
    return {
      success: false,
      error: error.message,
    }
  }
})

// App event listeners
app.whenReady().then(createLoginWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow()
  }
})

app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})