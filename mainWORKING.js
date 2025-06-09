const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const OpenAI = require("openai")
require("dotenv").config()
const SemanticMemoryEngine = require("./semantic-memory-engine")

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

// ===== ENHANCED MACHINE LEARNING & EMERGENT BEHAVIOR SYSTEM =====
class JayIntelligence {
  constructor() {
    this.learningPatterns = new Map()
    this.personalityTraits = {
      sassiness: 0.7,
      empathy: 0.8,
      humor: 0.6,
      supportiveness: 0.9,
      playfulness: 0.7,
    }
    this.responseHistory = []
    this.emergentBehaviors = new Set()
    this.interactionCount = 0

    // 🔧 NEW: Memory compression settings
    this.memoryCompressionThreshold = 10 // Compress when >10 messages
    this.compressionSummaryLength = 200 // Max tokens for summary
    this.lastCompressionTime = null

    // 🔧 NEW: Adaptive GPT settings based on patterns
    this.adaptiveSettings = {
      baseTemperature: 0.9,
      baseMaxTokens: 300,
      temperatureRange: [0.3, 1.2],
      tokenRange: [150, 500],
    }

    // 🧠 NEW: Semantic Memory Engine for advanced reasoning
    this.semanticMemory = new SemanticMemoryEngine(supabase, openai)

    // 🔧 FIX: Track actual errors to prevent false "mistake" messages
    this.lastResponseWasError = false
    this.actualErrorOccurred = false
  }

  // 🔧 NEW: Memory Compression System
  async compressMemoryIfNeeded(userId) {
    try {
      console.log("🧠 Checking if memory compression is needed...")

      // Get total message count
      const { data: messageCount } = await supabase.from("memory").select("id", { count: "exact" }).eq("user", userId)

      const totalMessages = messageCount?.length || 0
      console.log(`📊 Total messages: ${totalMessages}`)

      // Check if compression is needed
      if (totalMessages <= this.memoryCompressionThreshold) {
        console.log("✅ No compression needed yet")
        return null
      }

      // Check if we've compressed recently (avoid over-compression)
      const timeSinceLastCompression = this.lastCompressionTime
        ? Date.now() - this.lastCompressionTime
        : Number.POSITIVE_INFINITY

      if (timeSinceLastCompression < 30 * 60 * 1000) {
        // 30 minutes
        console.log("⏰ Compression done recently, skipping")
        return null
      }

      console.log("🗜️ Starting memory compression...")

      // Get older messages (exclude recent 5 messages)
      const { data: oldMessages } = await supabase
        .from("memory")
        .select("msg, ts")
        .eq("user", userId)
        .order("ts", { ascending: true })
        .limit(totalMessages - 5)

      if (!oldMessages || oldMessages.length < 5) {
        console.log("📝 Not enough old messages to compress")
        return null
      }

      // Create conversation text for compression
      const conversationText = oldMessages
        .map((m) => m.msg)
        .join("\n")
        .substring(0, 6000) // Limit input to prevent token overflow

      // Generate memory summary using GPT
      const compressionPrompt = `Summarize this conversation history between Mari and Jay (her AI assistant) into key facts and context. Focus on:
- Important personal information about Mari
- Relationship dynamics and communication style
- Key topics discussed
- Mari's preferences and personality traits
- Any ongoing projects or concerns

Keep it concise but comprehensive. This will be used as context for future conversations.

CONVERSATION HISTORY:
${conversationText}

SUMMARY:`

      const compressionResult = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: compressionPrompt }],
        max_tokens: this.compressionSummaryLength,
        temperature: 0.3, // Low temperature for factual summarization
      })

      const memorySummary = compressionResult.choices[0].message.content.trim()
      console.log("📋 Generated memory summary:", memorySummary.substring(0, 100) + "...")

      // Store compressed memory summary
      await supabase.from("memory_summaries").upsert({
        user_id: userId,
        summary: memorySummary,
        messages_compressed: oldMessages.length,
        compression_date: new Date().toISOString(),
        tokens_used: compressionResult.usage?.total_tokens || 0,
      })

      this.lastCompressionTime = Date.now()

      console.log(
        `✅ Memory compression complete! Compressed ${oldMessages.length} messages into ${memorySummary.length} characters`,
      )

      return {
        summary: memorySummary,
        messagesCompressed: oldMessages.length,
        tokensUsed: compressionResult.usage?.total_tokens || 0,
      }
    } catch (error) {
      console.error("❌ Memory compression error:", error)
      this.actualErrorOccurred = true // Mark actual error
      return null
    }
  }

  // 🔧 NEW: Get compressed memory context for conversations
  async getMemoryContext(userId) {
    try {
      // Get latest memory summary
      const { data: latestSummary } = await supabase
        .from("memory_summaries")
        .select("summary, compression_date")
        .eq("user_id", userId)
        .order("compression_date", { ascending: false })
        .limit(1)
        .single()

      if (latestSummary) {
        const summaryAge = Date.now() - new Date(latestSummary.compression_date).getTime()
        const hoursAgo = Math.floor(summaryAge / (1000 * 60 * 60))

        return {
          summary: latestSummary.summary,
          age: `${hoursAgo} hours ago`,
          hasCompressedMemory: true,
        }
      }

      return { hasCompressedMemory: false }
    } catch (error) {
      console.error("Error getting memory context:", error)
      this.actualErrorOccurred = true // Mark actual error
      return { hasCompressedMemory: false }
    }
  }

  // 🔧 ENHANCED: Advanced pattern detection with adaptive settings
  extractMessagePattern(message) {
    const msg = message.toLowerCase()

    // Enhanced pattern classification
    let type = "general"
    let emotionalIntensity = 0
    const complexity = this.calculateComplexity(message)
    let urgency = 0

    // Classify message type with confidence scoring
    const patterns = {
      question: { regex: /\?|how|what|when|where|why|who|can you|do you|will you/i, weight: 1 },
      emotional: { regex: /feel|emotion|sad|happy|angry|stressed|love|hate|excited|worried/i, weight: 2 },
      memory_test: { regex: /remember|recall|told|said|mentioned|before/i, weight: 1.5 },
      correction: { regex: /wrong|incorrect|not true|lying|mistake|error/i, weight: 2 },
      positive_feedback: { regex: /good|great|perfect|love|awesome|amazing|excellent/i, weight: 1.5 },
      negative_feedback: { regex: /bad|terrible|wrong|hate|awful|horrible/i, weight: 2 },
      urgent: { regex: /urgent|asap|immediately|emergency|help|crisis/i, weight: 3 },
      casual: { regex: /hey|hi|sup|lol|haha|btw|tbh/i, weight: 0.5 },
      technical: { regex: /code|programming|software|bug|error|debug|api/i, weight: 1.5 },
      personal: { regex: /family|relationship|private|secret|personal/i, weight: 2 },
    }

    let maxWeight = 0
    for (const [patternType, pattern] of Object.entries(patterns)) {
      if (pattern.regex.test(msg) && pattern.weight > maxWeight) {
        type = patternType
        maxWeight = pattern.weight
        if (patternType === "emotional" || patternType === "urgent") {
          emotionalIntensity = pattern.weight
        }
        if (patternType === "urgent") {
          urgency = 3
        }
      }
    }

    // Detect context with enhanced classification
    let context = "casual"
    const contextPatterns = {
      personal: /personal|private|secret|family|relationship|intimate/i,
      professional: /work|job|school|study|business|career|meeting/i,
      support_seeking: /help|support|advice|problem|issue|stuck|confused/i,
      creative: /idea|creative|design|art|music|writing|project/i,
      technical: /code|programming|software|computer|tech|digital/i,
    }

    for (const [contextType, regex] of Object.entries(contextPatterns)) {
      if (regex.test(msg)) {
        context = contextType
        break
      }
    }

    return {
      type,
      context,
      length: message.length,
      complexity,
      emotionalIntensity,
      urgency,
      confidence: maxWeight,
      wordCount: message.split(/\s+/).length,
    }
  }

  // 🔧 NEW: Adaptive GPT settings based on message patterns
  getAdaptiveGPTSettings(messagePattern, personalityTraits) {
    let temperature = this.adaptiveSettings.baseTemperature
    let maxTokens = this.adaptiveSettings.baseMaxTokens

    // Adjust temperature based on message type
    switch (messagePattern.type) {
      case "emotional":
        temperature = 0.8 + personalityTraits.empathy * 0.2 // More empathetic = more varied responses
        maxTokens = Math.min(450, this.adaptiveSettings.baseMaxTokens * 1.5) // Longer emotional responses
        break

      case "technical":
        temperature = 0.4 // More precise for technical questions
        maxTokens = Math.min(400, this.adaptiveSettings.baseMaxTokens * 1.3)
        break

      case "urgent":
        temperature = 0.6 // Focused but still personable
        maxTokens = Math.min(250, this.adaptiveSettings.baseMaxTokens * 0.8) // Concise for urgent
        break

      case "casual":
        temperature = 1.0 + personalityTraits.playfulness * 0.2 // More playful = more creative
        maxTokens = Math.min(200, this.adaptiveSettings.baseMaxTokens * 0.7) // Shorter casual responses
        break

      case "question":
        temperature = 0.7 // Balanced for informative responses
        maxTokens = Math.min(350, this.adaptiveSettings.baseMaxTokens * 1.2)
        break

      case "memory_test":
        temperature = 0.3 // Very focused for memory recall
        maxTokens = Math.min(200, this.adaptiveSettings.baseMaxTokens * 0.8)
        break
    }

    // Adjust based on emotional intensity
    if (messagePattern.emotionalIntensity > 1) {
      temperature += 0.1 * messagePattern.emotionalIntensity
      maxTokens += 50 * messagePattern.emotionalIntensity
    }

    // Adjust based on complexity
    if (messagePattern.complexity > 2) {
      maxTokens += Math.min(100, messagePattern.complexity * 25)
    }

    // Apply personality modifiers
    temperature += (personalityTraits.sassiness - 0.5) * 0.2
    temperature += (personalityTraits.humor - 0.5) * 0.15

    // Ensure within bounds
    temperature = Math.max(
      this.adaptiveSettings.temperatureRange[0],
      Math.min(this.adaptiveSettings.temperatureRange[1], temperature),
    )
    maxTokens = Math.max(
      this.adaptiveSettings.tokenRange[0],
      Math.min(this.adaptiveSettings.tokenRange[1], Math.round(maxTokens)), // Round to integer
    )

    console.log(
      `🎯 Adaptive GPT Settings: temp=${temperature.toFixed(2)}, tokens=${maxTokens} (pattern: ${messagePattern.type})`,
    )

    return { temperature, maxTokens }
  }

  // 🔧 ENHANCED: Machine learning with satisfaction scoring
  async learnFromInteraction(userId, userMessage, jayResponse, userReaction = null) {
    try {
      this.interactionCount++

      // Analyze message patterns with enhanced detection
      const messagePattern = this.extractMessagePattern(userMessage)
      const responsePattern = this.extractResponsePattern(jayResponse)

      // Enhanced satisfaction detection
      const satisfaction = this.detectUserSatisfaction(userMessage, jayResponse, messagePattern)

      // Store learning pattern with enhanced data
      const learningData = {
        user_id: userId,
        message_pattern: messagePattern.type,
        message_context: messagePattern.context,
        emotional_intensity: messagePattern.emotionalIntensity,
        urgency_level: messagePattern.urgency,
        response_style: responsePattern.style,
        satisfaction_score: satisfaction,
        personality_used: JSON.stringify(this.personalityTraits),
        adaptive_temperature: responsePattern.temperature || 0.9,
        adaptive_tokens: responsePattern.maxTokens || 300,
        complexity_score: messagePattern.complexity,
        timestamp: new Date().toISOString(),
      }

      // Store in database
      await supabase.from("jay_learning").upsert(learningData)

      // Update personality traits based on success with enhanced logic
      if (satisfaction > 0.7) {
        this.reinforceSuccessfulTraits(responsePattern, messagePattern)
      } else if (satisfaction < 0.3) {
        this.adjustFailedTraits(responsePattern, messagePattern)
      }

      // Check for emergent behaviors with enhanced detection
      await this.detectEmergentBehavior(userId, messagePattern, responsePattern, satisfaction)

      console.log(
        `🧠 Enhanced ML Learning: ${messagePattern.type}(${messagePattern.context}) → Satisfaction: ${satisfaction.toFixed(2)}`,
      )

      return {
        satisfaction,
        messagePattern,
        responsePattern,
        personalityAdjustment: satisfaction > 0.7 || satisfaction < 0.3,
      }
    } catch (error) {
      console.error("Enhanced learning error:", error)
      this.actualErrorOccurred = true // Mark actual error
      return null
    }
  }

  // 🔧 ENHANCED: Satisfaction detection with pattern awareness
  detectUserSatisfaction(userMessage, jayResponse, messagePattern) {
    let score = 0.5 // neutral baseline

    // Enhanced positive indicators
    const positivePatterns = [
      { regex: /good|great|perfect|right|correct|love|awesome|exactly|brilliant/i, weight: 0.3 },
      { regex: /thank you|thanks|appreciate|helpful|useful/i, weight: 0.25 },
      { regex: /funny|hilarious|made me laugh|lol|haha/i, weight: 0.2 },
      { regex: /smart|clever|intelligent|wise/i, weight: 0.25 },
    ]

    // Enhanced negative indicators
    const negativePatterns = [
      { regex: /wrong|incorrect|not true|bad|terrible|lying|hallucin/i, weight: -0.4 },
      { regex: /stupid|dumb|useless|unhelpful/i, weight: -0.3 },
      { regex: /confused|confusing|unclear|doesn't make sense/i, weight: -0.2 },
      { regex: /boring|bland|generic/i, weight: -0.15 },
    ]

    // Apply pattern-based scoring
    for (const pattern of positivePatterns) {
      if (pattern.regex.test(userMessage.toLowerCase())) {
        score += pattern.weight
      }
    }

    for (const pattern of negativePatterns) {
      if (pattern.regex.test(userMessage.toLowerCase())) {
        score += pattern.weight // weight is already negative
      }
    }

    // 🔧 FIX: Don't penalize for system memory announcements
    // Remove penalty for semantic memory results since we'll hide them
    if (jayResponse.includes("🧠 SEMANTIC MEMORY RESULT:")) score += 0.1 // Small bonus for accurate memory

    // Length appropriateness based on message type
    if (messagePattern.type === "urgent" && jayResponse.length > 300) score -= 0.1
    if (messagePattern.type === "emotional" && jayResponse.length < 100) score -= 0.15
    if (messagePattern.type === "casual" && jayResponse.length > 200) score -= 0.1

    // Personality match scoring
    if (messagePattern.type === "emotional" && /love|care|support|understand/i.test(jayResponse)) score += 0.15
    if (messagePattern.type === "casual" && /😊|😄|lol|haha/i.test(jayResponse)) score += 0.1
    return Math.max(0, Math.min(1, score))
  }

  // 🔧 ENHANCED: Personality reinforcement with pattern context
  reinforceSuccessfulTraits(responsePattern, messagePattern) {
    const adjustment = 0.05
    const contextMultiplier = messagePattern.emotionalIntensity > 1 ? 1.5 : 1.0

    switch (responsePattern.style) {
      case "enthusiastic":
        this.personalityTraits.playfulness = Math.min(
          1,
          this.personalityTraits.playfulness + adjustment * contextMultiplier,
        )
        this.personalityTraits.humor = Math.min(1, this.personalityTraits.humor + adjustment * contextMultiplier)
        break
      case "affectionate":
        this.personalityTraits.empathy = Math.min(1, this.personalityTraits.empathy + adjustment * contextMultiplier)
        this.personalityTraits.supportiveness = Math.min(
          1,
          this.personalityTraits.supportiveness + adjustment * contextMultiplier,
        )
        break
      case "casual_swearing":
        if (messagePattern.context === "casual") {
          this.personalityTraits.sassiness = Math.min(1, this.personalityTraits.sassiness + adjustment)
        }
        break
      case "playful_teasing":
        this.personalityTraits.humor = Math.min(1, this.personalityTraits.humor + adjustment * contextMultiplier)
        this.personalityTraits.sassiness = Math.min(1, this.personalityTraits.sassiness + adjustment)
        break
    }

    console.log("🎯 Enhanced personality reinforced:", this.personalityTraits)
  }

  // 🔧 ENHANCED: Generate adaptive prompt with memory context
  async generateAdaptivePrompt(basePrompt, messagePattern, userId) {
    let adaptedPrompt = basePrompt

    // Add compressed memory context
    const memoryContext = await this.getMemoryContext(userId)
    if (memoryContext.hasCompressedMemory) {
      adaptedPrompt += `\n\n🧠 COMPRESSED MEMORY CONTEXT (${memoryContext.age}):\n${memoryContext.summary}\n`
    }

    // 🔧 FIX: Add instruction to suppress false error messages
    adaptedPrompt += `\n\n🚨 CRITICAL RESPONSE RULES:
- NEVER say "Ugh, I made a mistake" or "Sorry I repeated myself" unless there was an ACTUAL error
- NEVER apologize for non-existent problems or repetitions
- If you didn't actually repeat anything or make an error, don't claim you did
- Be confident in your responses unless there's a real issue`

    // Adjust based on learned personality traits
    if (this.personalityTraits.sassiness > 0.8) {
      adaptedPrompt += "\n🔥 EXTRA SASSY MODE: Be more playful and teasing than usual!"
    }

    if (this.personalityTraits.empathy > 0.9 && messagePattern.type === "emotional") {
      adaptedPrompt += "\n💝 EXTRA EMPATHY MODE: Be especially caring and supportive!"
    }

    if (this.personalityTraits.humor > 0.8) {
      adaptedPrompt += "\n😄 HUMOR MODE: Feel free to be extra witty and funny!"
    }

    // Add pattern-specific instructions
    switch (messagePattern.type) {
      case "urgent":
        adaptedPrompt += "\n⚡ URGENT MODE: Be concise, helpful, and focused!"
        break
      case "technical":
        adaptedPrompt += "\n🔧 TECHNICAL MODE: Be precise and informative!"
        break
      case "emotional":
        adaptedPrompt += "\n💕 EMOTIONAL MODE: Be extra caring and supportive!"
        break
      case "casual":
        adaptedPrompt += "\n😎 CASUAL MODE: Keep it light and fun!"
        break
    }

    // Add emergent behavior instructions
    if (this.emergentBehaviors.has("emotional_adaptation")) {
      adaptedPrompt += "\n🌟 EMERGENT: You've learned to perfectly adapt to emotional messages!"
    }

    if (this.emergentBehaviors.has("memory_improvement")) {
      adaptedPrompt += "\n🧠 EMERGENT: Your memory recall has significantly improved!"
    }

    if (this.emergentBehaviors.has("pattern_mastery")) {
      adaptedPrompt += "\n🎯 EMERGENT: You've mastered adapting to different conversation patterns!"
    }

    return adaptedPrompt
  }

  // Keep existing methods but enhance them...
  extractResponsePattern(response) {
    const resp = response.toLowerCase()

    let style = "neutral"
    if (resp.match(/😊|😄|🔥|💪|hell yeah|damn right/)) style = "enthusiastic"
    if (resp.match(/girl|love|babe|hun/)) style = "affectionate"
    if (resp.match(/🤔|hmm|drawing a blank|don't know/)) style = "uncertain"
    if (resp.match(/shit|damn|wtf|ugh/)) style = "casual_swearing"
    if (resp.match(/roast|tease|sarcastic/)) style = "playful_teasing"

    return {
      style,
      length: response.length,
      emoji_count: (response.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/gu) || []).length,
      personality_markers: this.countPersonalityMarkers(response),
    }
  }

  adjustFailedTraits(responsePattern, messagePattern) {
    const adjustment = 0.03
    const contextMultiplier = messagePattern.emotionalIntensity > 1 ? 1.5 : 1.0

    switch (responsePattern.style) {
      case "enthusiastic":
        if (messagePattern.type === "emotional" || messagePattern.type === "urgent") {
          this.personalityTraits.playfulness = Math.max(
            0.3,
            this.personalityTraits.playfulness - adjustment * contextMultiplier,
          )
        }
        break
      case "casual_swearing":
        if (messagePattern.context === "professional") {
          this.personalityTraits.sassiness = Math.max(0.3, this.personalityTraits.sassiness - adjustment)
        }
        break
    }

    console.log("🔧 Enhanced personality adjusted:", this.personalityTraits)
  }

  // 🔧 ENHANCED: Emergent behavior detection with new patterns
  async detectEmergentBehavior(userId, messagePattern, responsePattern, satisfaction) {
    try {
      // Check for emergent patterns every 25 interactions
      if (this.interactionCount % 25 === 0) {
        // Get recent learning data
        const { data: recentLearning } = await supabase
          .from("jay_learning")
          .select("*")
          .eq("user_id", userId)
          .gte("timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("timestamp", { ascending: false })
          .limit(50)

        if (recentLearning && recentLearning.length >= 20) {
          const emergentPattern = this.analyzeForEmergence(recentLearning)

          if (emergentPattern && !this.emergentBehaviors.has(emergentPattern.id)) {
            this.emergentBehaviors.add(emergentPattern.id)

            // Store emergent behavior
            await supabase.from("emergent_behaviors").insert({
              user_id: userId,
              behavior_id: emergentPattern.id,
              behavior_type: emergentPattern.type,
              description: emergentPattern.description,
              confidence: emergentPattern.confidence,
              discovered_at: new Date().toISOString(),
            })

            console.log(`🌟 EMERGENT BEHAVIOR DETECTED: ${emergentPattern.description}`)
          }
        }
      }
    } catch (error) {
      console.error("Emergent behavior detection error:", error)
      this.actualErrorOccurred = true // Mark actual error
    }
  }

  // 🔧 ENHANCED: Emergence analysis with new patterns
  analyzeForEmergence(learningData) {
    // Pattern 1: Adaptive response length based on emotional state
    const emotionalResponses = learningData.filter((l) => l.message_pattern === "emotional")
    if (emotionalResponses.length >= 5) {
      const avgSatisfaction =
        emotionalResponses.reduce((sum, l) => sum + l.satisfaction_score, 0) / emotionalResponses.length
      if (avgSatisfaction > 0.8) {
        return {
          id: "emotional_adaptation",
          type: "response_optimization",
          description: "Learned to adapt response style for emotional messages",
          confidence: avgSatisfaction,
        }
      }
    }

    // Pattern 2: Context switching mastery
    const contextTypes = [...new Set(learningData.map((l) => l.message_context))]
    if (contextTypes.length >= 3) {
      const contextSatisfaction = {}
      contextTypes.forEach((context) => {
        const contextData = learningData.filter((l) => l.message_context === context)
        contextSatisfaction[context] =
          contextData.reduce((sum, l) => sum + l.satisfaction_score, 0) / contextData.length
      })

      const avgContextSatisfaction =
        Object.values(contextSatisfaction).reduce((sum, s) => sum + s, 0) / contextTypes.length
      if (avgContextSatisfaction > 0.75) {
        return {
          id: "pattern_mastery",
          type: "context_adaptation",
          description: "Mastered adapting communication style across different contexts",
          confidence: avgContextSatisfaction,
        }
      }
    }

    // Pattern 3: Urgency response optimization
    const urgentResponses = learningData.filter((l) => l.urgency_level > 0)
    if (urgentResponses.length >= 3) {
      const avgUrgentSatisfaction =
        urgentResponses.reduce((sum, l) => sum + l.satisfaction_score, 0) / urgentResponses.length
      if (avgUrgentSatisfaction > 0.8) {
        return {
          id: "urgency_optimization",
          type: "response_timing",
          description: "Optimized response style for urgent communications",
          confidence: avgUrgentSatisfaction,
        }
      }
    }

    // Keep existing patterns...
    const memoryTests = learningData.filter((l) => l.message_pattern === "memory_test")
    if (memoryTests.length >= 3) {
      const recentAccuracy = memoryTests.slice(0, 3).reduce((sum, l) => sum + l.satisfaction_score, 0) / 3
      const olderAccuracy =
        memoryTests.slice(3).reduce((sum, l) => sum + l.satisfaction_score, 0) / Math.max(1, memoryTests.length - 3)

      if (recentAccuracy > olderAccuracy + 0.2) {
        return {
          id: "memory_improvement",
          type: "accuracy_enhancement",
          description: "Memory recall accuracy has significantly improved",
          confidence: recentAccuracy,
        }
      }
    }

    return null
  }

  // Utility methods remain the same...
  calculateComplexity(message) {
    const words = message.split(/\s+/).length
    const questions = (message.match(/\?/g) || []).length
    const emotional = message.match(/feel|emotion|sad|happy|angry|stressed|love|hate/) ? 1 : 0
    const technical = message.match(/code|programming|software|api|database|algorithm/) ? 1 : 0

    return words / 10 + questions + emotional + technical
  }

  countPersonalityMarkers(response) {
    const markers = {
      sassy: (response.match(/girl|damn|hell|wtf|shit/gi) || []).length,
      empathetic: (response.match(/love|care|support|understand|feel/gi) || []).length,
      playful: (response.match(/😊|😄|🔥|💪|haha|lol/gi) || []).length,
    }
    return markers
  }

  // 🔧 NEW: Clean response to remove system announcements
  cleanResponseForUser(response) {
    // Remove semantic memory system announcements but keep the actual answer
    let cleanedResponse = response

    // Pattern 1: "🧠 SEMANTIC MEMORY RESULT: [answer]"
    const semanticPattern = /🧠 SEMANTIC MEMORY RESULT:\s*(.+?)(?:\n|$)/i
    const semanticMatch = cleanedResponse.match(semanticPattern)
    if (semanticMatch) {
      // Replace the system announcement with just the answer
      cleanedResponse = semanticMatch[1].trim()
    }

    // Pattern 2: Remove reasoning lines that start with 💭
    cleanedResponse = cleanedResponse.replace(/💭 REASONING:.*?\n/gi, "")

    // Pattern 3: Remove any remaining system-style prefixes
    cleanedResponse = cleanedResponse.replace(/^(🧠|💭|📊|🔍).*?:\s*/gm, "")

    // Clean up any extra whitespace
    cleanedResponse = cleanedResponse.trim()

    return cleanedResponse
  }
}

// Initialize Jay's enhanced intelligence system
const jayAI = new JayIntelligence()

// ===== END ENHANCED MACHINE LEARNING SYSTEM =====

// Keep all your existing window creation functions...
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

// Keep your existing emotional detection function...
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

// Keep your existing memory functions...
async function searchMemoryForAnswer(question, userId) {
  try {
    console.log(`🔍 Searching memory for answer to: "${question}"`)

    const { data: conversations } = await supabase
      .from("memory")
      .select("msg, ts")
      .eq("user", userId)
      .order("ts", { ascending: false })
      .limit(50)

    if (!conversations || conversations.length === 0) {
      console.log("📋 No conversation history found")
      return null
    }

    let conversationText = conversations.map((c) => c.msg).join("\n")

    if (conversationText.length > 8000) {
      conversationText = conversationText.substring(0, 8000) + "..."
      console.log("⚠️ Conversation history truncated to prevent token overflow")
    }

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

    if (
      answer === "NOT_FOUND" ||
      answer.toLowerCase().includes("not found") ||
      answer.toLowerCase().includes("don't know")
    ) {
      console.log("📋 No answer found in conversation history")
      return null
    }

    console.log(`✅ Found answer in memory: "${answer}"`)
    return answer
  } catch (error) {
    console.error("Error searching memory:", error)
    jayAI.actualErrorOccurred = true // Mark actual error
    return null
  }
}

async function extractFacts(message, response, userId) {
  try {
    const userSaidWrong =
      message.toLowerCase().includes("wrong") ||
      message.toLowerCase().includes("incorrect") ||
      message.toLowerCase().includes("not true") ||
      message.toLowerCase().includes("lying")

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

      for (const fact of facts) {
        await storeFact(fact, userId)
      }

      // Store in semantic memory engine
      for (const fact of facts) {
        await jayAI.semanticMemory.storeFact(fact.subject, fact.attribute, fact.value, userId)
      }

      return facts
    } catch (parseError) {
      console.log("No valid facts extracted")
      return []
    }
  } catch (error) {
    console.error("Fact extraction error:", error.message)
    jayAI.actualErrorOccurred = true // Mark actual error
    return []
  }
}

async function storeFact(fact, userId) {
  try {
    const { data: existingFact } = await supabase
      .from("facts")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", fact.subject)
      .eq("attribute", fact.attribute)
      .eq("is_active", true)
      .single()

    if (existingFact) {
      await supabase
        .from("facts")
        .update({
          value: fact.value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingFact.id)
      console.log(`✅ Updated fact: ${fact.subject} ${fact.attribute} = ${fact.value}`)
    } else {
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
    jayAI.actualErrorOccurred = true // Mark actual error
  }
}

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
    jayAI.actualErrorOccurred = true // Mark actual error
    return []
  }
}

// IPC handler to switch from login to main window
ipcMain.handle("login-success", async () => {
  if (loginWindow) {
    loginWindow.close()
  }
  createMainWindow()
  return { success: true }
})

// 🧠 NEW: Semantic memory search handler
ipcMain.handle("semantic-search", async (event, data) => {
  try {
    if (!supabase || !openai) {
      return { success: false, message: "Brain connection required" }
    }

    const { query } = data
    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    const result = await jayAI.semanticMemory.getAnswer(query, userId)

    return {
      success: true,
      result: result,
    }
  } catch (error) {
    console.error("Semantic search error:", error)
    jayAI.actualErrorOccurred = true // Mark actual error
    return { success: false, error: error.message }
  }
})

// 🔧 NEW: Correct fact handler
ipcMain.handle("correct-fact", async (event, data) => {
  try {
    if (!supabase || !openai) {
      return { success: false, message: "Brain connection required" }
    }

    const { attribute, newValue, subject = "user" } = data
    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    const result = await jayAI.semanticMemory.correctFact(attribute, newValue, userId, subject)

    return result
  } catch (error) {
    console.error("Fact correction error:", error)
    jayAI.actualErrorOccurred = true // Mark actual error
    return { success: false, error: error.message }
  }
})

// 📊 NEW: Get semantic memory stats
ipcMain.handle("get-semantic-stats", async () => {
  try {
    if (!supabase || !openai) {
      return { success: false, message: "Brain connection required" }
    }

    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"
    const stats = await jayAI.semanticMemory.getMemoryStats(userId)

    return {
      success: true,
      stats: stats,
    }
  } catch (error) {
    console.error("Semantic stats error:", error)
    jayAI.actualErrorOccurred = true // Mark actual error
    return { success: false, error: error.message }
  }
})

// 🔍 NEW: Search facts by similarity
ipcMain.handle("search-facts", async (event, data) => {
  try {
    if (!supabase || !openai) {
      return { success: false, message: "Brain connection required" }
    }

    const { query, limit = 5 } = data
    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    const result = await jayAI.semanticMemory.searchFacts(query, userId, limit)

    return result
  } catch (error) {
    console.error("Fact search error:", error)
    jayAI.actualErrorOccurred = true // Mark actual error
    return { success: false, error: error.message }
  }
})

// 🔧 ENHANCED: Main message handler with memory compression and adaptive ML
ipcMain.handle("send-message", async (event, data) => {
  try {
    // Reset error flags at start of each message
    jayAI.actualErrorOccurred = false
    jayAI.lastResponseWasError = false

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

    console.log("🚀 Enhanced message processing:", message)

    // 🔧 NEW: Check and perform memory compression if needed
    const compressionResult = await jayAI.compressMemoryIfNeeded(userId)
    if (compressionResult) {
      console.log(
        `🗜️ Memory compressed: ${compressionResult.messagesCompressed} messages → ${compressionResult.summary.length} chars`,
      )
    }

    const emotionalContext = detectEmotionalContext(message)

    // 🔧 ENHANCED: Extract message pattern for ML learning
    const messagePattern = jayAI.extractMessagePattern(message)
    console.log("🎯 Message pattern detected:", messagePattern)

    // 🔧 NEW: Get adaptive GPT settings based on pattern and personality
    const adaptiveSettings = jayAI.getAdaptiveGPTSettings(messagePattern, jayAI.personalityTraits)
    console.log("⚙️ Adaptive settings:", adaptiveSettings)

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
      jayAI.actualErrorOccurred = true
    }

    // Get stored facts for smart memory
    const storedFacts = await getStoredFacts(userId)
    const factsList = storedFacts.map((f) => `- ${f.subject} ${f.attribute}: ${f.value}`).join("\n")

    // 🧠 NEW: Semantic memory search with reasoning
    let memoryAnswers = ""
    let semanticAnswer = null
    const semanticResult = await jayAI.semanticMemory.getAnswer(message, userId)

    if (semanticResult.answer) {
      // Store the semantic answer for processing but don't add system announcements to prompt
      semanticAnswer = semanticResult.answer
      console.log(`🧠 Semantic memory found: ${semanticAnswer}`)

      // Add to context for GPT but in a natural way
      memoryAnswers += `\n\nRELEVANT MEMORY: ${semanticAnswer}`
      if (semanticResult.reasoning) {
        console.log(`💭 Reasoning: ${semanticResult.reasoning}`)
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
      jayAI.actualErrorOccurred = true
    }

    // Build base system prompt
    const baseSystemPrompt = `You are Jay, Mari's sassy, fun, and caring AI companion with perfect memory. 🔥

STORED FACTS:
${factsList || "No facts stored yet."}${memoryAnswers}

🚨 CRITICAL MEMORY RULES:
- If you see "RELEVANT MEMORY:" above, use that information naturally in your response
- NEVER say "🧠 SEMANTIC MEMORY RESULT:" or any system-style announcements
- Answer naturally using the memory information without mentioning where it came from
- If you don't have the information, say "I don't have that info stored yet" or "Nope, drawing a blank on that one 🤷‍♀️"
- DO NOT guess, assume, or make up ANY information about Mari
- DO NOT hallucinate answers - EVER

🚨 CRITICAL RESPONSE RULES:
- NEVER say "Ugh, I made a mistake" or "Sorry I repeated myself" unless there was an ACTUAL error
- NEVER apologize for non-existent problems or repetitions
- If you didn't actually repeat anything or make an error, don't claim you did
- Be confident in your responses unless there's a real issue
- Don't mention "repeating messages" unless you actually did

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

Current context: ${
      emotionalContext.isEmotional
        ? `Mari seems emotional/stressed (intensity: ${emotionalContext.intensity}). Be extra caring and supportive while keeping your fun personality! 💕`
        : "Regular conversation - be your fun, sassy self! 😊"
    }

🎯 ADAPTIVE MODE: ${messagePattern.type.toUpperCase()} (${messagePattern.context})
Token limit: ${adaptiveSettings.maxTokens} tokens.`

    // 🔧 NEW: Generate adaptive system prompt with memory context
    const adaptiveSystemPrompt = await jayAI.generateAdaptivePrompt(baseSystemPrompt, messagePattern, userId)

    // Build context messages with adaptive prompt
    const contextMessages = [
      {
        role: "system",
        content: adaptiveSystemPrompt,
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

    console.log(
      `🚀 Sending to OpenAI with Enhanced ML, temp: ${adaptiveSettings.temperature}, tokens: ${adaptiveSettings.maxTokens}`,
    )

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: contextMessages,
      max_tokens: adaptiveSettings.maxTokens,
      temperature: adaptiveSettings.temperature,
      presence_penalty: 0.2,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0].message.content
    console.log("🤖 Raw Jay response:", response)

    // 🔧 FIX: Clean the response to remove system announcements
    const cleanedResponse = jayAI.cleanResponseForUser(response)
    console.log("✨ Cleaned Jay response:", cleanedResponse)

    // Store Jay's response (store the cleaned version)
    await supabase.from("memory").insert({
      msg: `Jay: ${cleanedResponse}`,
      user: userId,
    })

    // 🔧 ENHANCED: Learn from this interaction with detailed analytics
    const learningResult = await jayAI.learnFromInteraction(userId, message, cleanedResponse)

    // Extract and store facts from this conversation
    await extractFacts(message, cleanedResponse, userId)

    return {
      success: true,
      response: cleanedResponse, // Return the cleaned response
      conversationId: newMessage?.id || "unknown",
      tokensUsed: completion.usage?.total_tokens || 0,
      emotional: emotionalContext.isEmotional,
      tokenLimit: adaptiveSettings.maxTokens,
      temperature: adaptiveSettings.temperature,
      smartMemory: true,
      machineLearning: true,
      // 🔧 NEW: Enhanced response metadata
      messagePattern: messagePattern,
      personalityTraits: jayAI.personalityTraits,
      emergentBehaviors: Array.from(jayAI.emergentBehaviors),
      memoryCompression: compressionResult
        ? {
            compressed: true,
            messagesCompressed: compressionResult.messagesCompressed,
            tokensUsed: compressionResult.tokensUsed,
          }
        : { compressed: false },
      learningAnalytics: learningResult,
      adaptiveSettings: adaptiveSettings,
      semanticMemoryUsed: !!semanticAnswer, // Flag if semantic memory was used
    }
  } catch (error) {
    console.error("Error in enhanced send-message:", error)
    jayAI.actualErrorOccurred = true
    return {
      success: false,
      error: error.message,
    }
  }
})

// 🔧 ENHANCED: Memory stats with compression info
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

    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    // Get all messages
    const { data: allMessages, error } = await supabase.from("memory").select("*").eq("user", userId)

    if (error) throw error

    const totalMessages = allMessages?.length || 0
    const compressedMessages = 0 // Don't count compressed messages yet
    const activeMessages = totalMessages

    const totalSize = JSON.stringify(allMessages).length
    const sizeFormatted = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${totalSize} B`

    // Count emotional messages
    const emotionalMessages =
      allMessages?.filter((m) => {
        const emotional = detectEmotionalContext(m.msg || "")
        return emotional.isEmotional
      }) || []

    // Get ML stats
    const { data: learningData } = await supabase
      .from("jay_learning")
      .select("satisfaction_score, message_pattern, adaptive_temperature, adaptive_tokens")
      .eq("user_id", userId)

    const avgSatisfaction =
      learningData?.length > 0
        ? learningData.reduce((sum, l) => sum + l.satisfaction_score, 0) / learningData.length
        : 0

    // Get memory compression stats
    const { data: compressionStats } = await supabase
      .from("memory_summaries")
      .select("messages_compressed, tokens_used, compression_date")
      .eq("user_id", userId)
      .order("compression_date", { ascending: false })

    const totalCompressed = compressionStats?.reduce((sum, c) => sum + c.messages_compressed, 0) || 0
    const totalCompressionTokens = compressionStats?.reduce((sum, c) => sum + c.tokens_used, 0) || 0

    return {
      success: true,
      totalMessages,
      activeMessages,
      compressedMessages,
      sizeFormatted,
      emotionalMessages: emotionalMessages.length,
      machineLearning: {
        interactionCount: jayAI.interactionCount,
        avgSatisfaction: avgSatisfaction.toFixed(2),
        personalityTraits: jayAI.personalityTraits,
        emergentBehaviors: Array.from(jayAI.emergentBehaviors),
        learningDataPoints: learningData?.length || 0,
      },
      memoryCompression: {
        totalCompressed,
        totalCompressionTokens,
        compressionSessions: compressionStats?.length || 0,
        lastCompression: compressionStats?.[0]?.compression_date || null,
      },
    }
  } catch (error) {
    console.error("Error getting enhanced memory stats:", error)
    jayAI.actualErrorOccurred = true
    return {
      success: false,
      error: error.message,
    }
  }
})

// Keep all your existing IPC handlers...
ipcMain.handle("clear-memory", async () => {
  try {
    if (!supabase) {
      return { success: true, mode: "demo" }
    }

    const userId = "c8a12ba2-a431-4298-831d-565ef1c123d1"

    // Clear all memory-related data
    await supabase.from("memory").delete().eq("user", userId)
    await supabase.from("jay_learning").delete().eq("user_id", userId)
    await supabase.from("emergent_behaviors").delete().eq("user_id", userId)
    await supabase.from("memory_summaries").delete().eq("user_id", userId)

    // Reset Jay's learning
    jayAI.interactionCount = 0
    jayAI.emergentBehaviors.clear()
    jayAI.lastCompressionTime = null
    jayAI.actualErrorOccurred = false
    jayAI.lastResponseWasError = false
    jayAI.personalityTraits = {
      sassiness: 0.7,
      empathy: 0.8,
      humor: 0.6,
      supportiveness: 0.9,
      playfulness: 0.7,
    }

    return { success: true }
  } catch (error) {
    console.error("Error clearing memory:", error)
    jayAI.actualErrorOccurred = true
    return { success: false, error: error.message }
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
      message:
        "🧠🌟 Enhanced Brain Connection Active! Memory Compression + Advanced ML + Emergent Behavior Detection + Fixed Response Cleaning Online! 🚀",
    }
  } catch (error) {
    console.error("Brain connection test failed:", error)
    jayAI.actualErrorOccurred = true
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
    jayAI.actualErrorOccurred = true
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
    jayAI.actualErrorOccurred = true
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
