const OpenAI = require("openai")

class SemanticMemoryEngine {
  constructor(supabase, openai) {
    this.supabase = supabase
    this.openai = openai
    this.embeddingCache = new Map() // Cache embeddings to reduce API calls
    this.factEmbeddings = new Map() // Cache fact embeddings
    this.reasoningChains = new Map() // Store reasoning patterns

    // Semantic similarity threshold for matching
    this.similarityThreshold = 0.75

    // Initialize reasoning patterns
    this.initializeReasoningPatterns()
  }

  // 🧠 CORE: Get semantic answer with reasoning
  async getAnswer(question, userId) {
    try {
      console.log(`🔍 Semantic search for: "${question}"`)

      // Step 1: Get question embedding
      const questionEmbedding = await this.getEmbedding(question)

      // Step 2: Load and embed all facts if not cached
      await this.loadFactEmbeddings(userId)

      // Step 3: Find semantically similar facts
      const relevantFacts = await this.findRelevantFacts(questionEmbedding, userId)

      if (relevantFacts.length === 0) {
        return {
          answer: null,
          confidence: 0,
          reasoning: "I don't have any relevant information stored about that.",
          factsUsed: [],
        }
      }

      // Step 4: Apply reasoning chains to infer answer
      const reasoningResult = await this.applyReasoningChains(question, relevantFacts, userId)

      // Step 5: Generate natural language answer with explanation
      const finalAnswer = await this.generateAnswerWithReasoning(question, reasoningResult)

      console.log(`✅ Semantic answer found: ${finalAnswer.answer}`)
      console.log(`🧠 Reasoning: ${finalAnswer.reasoning}`)

      return finalAnswer
    } catch (error) {
      console.error("Semantic memory error:", error)
      return {
        answer: null,
        confidence: 0,
        reasoning: "I had trouble accessing my memory for that question.",
        factsUsed: [],
        error: error.message,
      }
    }
  }

  // 🔧 Generate embeddings with caching
  async getEmbedding(text) {
    const cacheKey = text.toLowerCase().trim()

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)
    }

    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small", // More cost-effective than ada-002
        input: text,
      })

      const embedding = response.data[0].embedding
      this.embeddingCache.set(cacheKey, embedding)

      return embedding
    } catch (error) {
      console.error("Embedding generation error:", error)
      throw error
    }
  }

  // 📊 Load and cache fact embeddings
  async loadFactEmbeddings(userId) {
    try {
      // Get all facts for user
      const { data: facts } = await this.supabase.from("facts").select("*").eq("user_id", userId).eq("is_active", true)

      if (!facts) return

      // Generate embeddings for facts that don't have them cached
      for (const fact of facts) {
        const factKey = `${fact.subject}_${fact.attribute}_${fact.value}`

        if (!this.factEmbeddings.has(factKey)) {
          // Create searchable text from fact
          const searchableText = this.createSearchableText(fact)
          const embedding = await this.getEmbedding(searchableText)

          this.factEmbeddings.set(factKey, {
            fact,
            embedding,
            searchableText,
          })
        }
      }

      console.log(`📚 Loaded ${this.factEmbeddings.size} fact embeddings`)
    } catch (error) {
      console.error("Error loading fact embeddings:", error)
    }
  }

  // 🔤 Create searchable text from fact
  createSearchableText(fact) {
    // Create multiple variations for better matching
    const variations = [
      `${fact.subject} ${fact.attribute} ${fact.value}`,
      `${fact.attribute} is ${fact.value}`,
      `${fact.subject} has ${fact.attribute} ${fact.value}`,
      `${fact.value} ${fact.attribute}`,
    ]

    // Add semantic variations based on attribute type
    const semanticVariations = this.generateSemanticVariations(fact)

    return [...variations, ...semanticVariations].join(" ")
  }

  // 🎯 Generate semantic variations for better matching
  generateSemanticVariations(fact) {
    const variations = []

    // Map common attributes to question patterns
    const attributeMap = {
      school: ["college", "university", "education", "studied", "degree"],
      workplace: ["work", "job", "company", "employer", "career"],
      eye_color: ["eyes", "eye color", "what color eyes"],
      favorite_drink: ["drink", "beverage", "likes to drink"],
      breakfast: ["morning meal", "eat in morning", "start the day"],
      name: ["called", "named", "name is"],
      reason_for_naming: ["why named", "named after", "name comes from"],
    }

    if (attributeMap[fact.attribute]) {
      attributeMap[fact.attribute].forEach((variation) => {
        variations.push(`${fact.subject} ${variation} ${fact.value}`)
        variations.push(`${variation} ${fact.value}`)
      })
    }

    return variations
  }

  // 🔍 Find semantically relevant facts
  async findRelevantFacts(questionEmbedding, userId, limit = 10) {
    const relevantFacts = []

    // Calculate similarity with all cached fact embeddings
    for (const [factKey, factData] of this.factEmbeddings) {
      if (factData.fact.user_id === userId) {
        const similarity = this.cosineSimilarity(questionEmbedding, factData.embedding)

        if (similarity > this.similarityThreshold) {
          relevantFacts.push({
            ...factData.fact,
            similarity,
            searchableText: factData.searchableText,
          })
        }
      }
    }

    // Sort by similarity and return top results
    return relevantFacts.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }

  // 📐 Calculate cosine similarity between embeddings
  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))

    return dotProduct / (magnitudeA * magnitudeB)
  }

  // 🧠 Apply reasoning chains to infer answers
  async applyReasoningChains(question, relevantFacts, userId) {
    console.log(`🔗 Applying reasoning chains to ${relevantFacts.length} facts`)

    // Group facts by subject for relationship analysis
    const factsBySubject = this.groupFactsBySubject(relevantFacts)

    // Apply different reasoning strategies
    const reasoningStrategies = [
      this.directFactMatch.bind(this),
      this.relationshipInference.bind(this),
      this.narrativeReconstruction.bind(this),
      this.attributeMapping.bind(this),
    ]

    let bestResult = null
    let highestConfidence = 0

    for (const strategy of reasoningStrategies) {
      const result = await strategy(question, relevantFacts, factsBySubject, userId)

      if (result && result.confidence > highestConfidence) {
        bestResult = result
        highestConfidence = result.confidence
      }
    }

    return (
      bestResult || {
        answer: null,
        confidence: 0,
        reasoning: "I found some related information but couldn't piece together a clear answer.",
        factsUsed: relevantFacts.slice(0, 3),
        strategy: "none",
      }
    )
  }

  // 🎯 Strategy 1: Direct fact matching
  async directFactMatch(question, relevantFacts, factsBySubject, userId) {
    if (relevantFacts.length === 0) return null

    const topFact = relevantFacts[0]

    // High confidence if similarity is very high
    if (topFact.similarity > 0.9) {
      return {
        answer: topFact.value,
        confidence: topFact.similarity,
        reasoning: `I remember you told me that ${topFact.subject} ${topFact.attribute} is ${topFact.value}.`,
        factsUsed: [topFact],
        strategy: "direct_match",
      }
    }

    return null
  }

  // 🔗 Strategy 2: Relationship inference
  async relationshipInference(question, relevantFacts, factsBySubject, userId) {
    // Look for connected facts about the same subject
    for (const [subject, facts] of Object.entries(factsBySubject)) {
      if (facts.length > 1) {
        // Try to infer relationships
        const inference = this.inferFromRelatedFacts(question, facts)
        if (inference) {
          return {
            ...inference,
            strategy: "relationship_inference",
          }
        }
      }
    }

    return null
  }

  // 📖 Strategy 3: Narrative reconstruction
  async narrativeReconstruction(question, relevantFacts, factsBySubject, userId) {
    // Look for story-like patterns (especially for "why" questions)
    if (question.toLowerCase().includes("why") || question.toLowerCase().includes("how")) {
      const narrative = await this.reconstructNarrative(question, relevantFacts, userId)
      if (narrative) {
        return {
          ...narrative,
          strategy: "narrative_reconstruction",
        }
      }
    }

    return null
  }

  // 🗺️ Strategy 4: Attribute mapping
  async attributeMapping(question, relevantFacts, factsBySubject, userId) {
    // Map question patterns to fact attributes
    const attributePatterns = {
      "college|university|school|studied": "school",
      "work|job|company": "workplace",
      "eyes|eye color": "eye_color",
      "drink|beverage": "favorite_drink",
      "breakfast|morning|start.*day": "breakfast",
      "name|called": "name",
    }

    for (const [pattern, attribute] of Object.entries(attributePatterns)) {
      if (new RegExp(pattern, "i").test(question)) {
        const matchingFact = relevantFacts.find((f) => f.attribute === attribute)
        if (matchingFact) {
          return {
            answer: matchingFact.value,
            confidence: 0.8,
            reasoning: `Based on what you've told me, ${matchingFact.subject} ${attribute.replace("_", " ")} is ${matchingFact.value}.`,
            factsUsed: [matchingFact],
            strategy: "attribute_mapping",
          }
        }
      }
    }

    return null
  }

  // 🧩 Infer from related facts about same subject
  inferFromRelatedFacts(question, facts) {
    // Example: If asking about Julio and we have multiple Julio facts
    const subject = facts[0].subject

    // Special handling for emotional/relationship questions
    if (question.toLowerCase().includes("who is") || question.toLowerCase().includes("tell me about")) {
      const description = facts.map((f) => `${f.attribute}: ${f.value}`).join(", ")
      return {
        answer: description,
        confidence: 0.85,
        reasoning: `From what you've told me about ${subject}: ${description}`,
        factsUsed: facts,
      }
    }

    return null
  }

  // 📚 Reconstruct narrative from facts
  async reconstructNarrative(question, relevantFacts, userId) {
    // Look for narrative patterns, especially around naming and relationships
    if (question.toLowerCase().includes("why") && question.toLowerCase().includes("name")) {
      const namingFacts = relevantFacts.filter((f) => f.attribute.includes("name") || f.attribute.includes("reason"))

      if (namingFacts.length > 0) {
        const narrative = namingFacts.map((f) => f.value).join(" ")
        return {
          answer: narrative,
          confidence: 0.9,
          reasoning: `I remember the story you told me: ${narrative}`,
          factsUsed: namingFacts,
        }
      }
    }

    return null
  }

  // 📊 Group facts by subject for analysis
  groupFactsBySubject(facts) {
    const grouped = {}
    facts.forEach((fact) => {
      if (!grouped[fact.subject]) {
        grouped[fact.subject] = []
      }
      grouped[fact.subject].push(fact)
    })
    return grouped
  }

  // 💬 Generate natural language answer with reasoning
  async generateAnswerWithReasoning(question, reasoningResult) {
    if (!reasoningResult || !reasoningResult.answer) {
      return {
        answer: null,
        confidence: 0,
        reasoning: "I don't have enough information stored to answer that question.",
        factsUsed: [],
      }
    }

    // Enhance the reasoning explanation
    let enhancedReasoning = reasoningResult.reasoning

    if (reasoningResult.factsUsed.length > 1) {
      enhancedReasoning += ` I connected ${reasoningResult.factsUsed.length} pieces of information to figure this out.`
    }

    return {
      answer: reasoningResult.answer,
      confidence: reasoningResult.confidence,
      reasoning: enhancedReasoning,
      factsUsed: reasoningResult.factsUsed,
      strategy: reasoningResult.strategy,
    }
  }

  // 💾 Store fact with semantic indexing
  async storeFact(subject, attribute, value, userId, confidence = 0.9) {
    try {
      // Check if fact already exists
      const { data: existingFact } = await this.supabase
        .from("facts")
        .select("*")
        .eq("user_id", userId)
        .eq("subject", subject)
        .eq("attribute", attribute)
        .eq("is_active", true)
        .single()

      let factId

      if (existingFact) {
        // Update existing fact
        const { data: updatedFact } = await this.supabase
          .from("facts")
          .update({
            value: value,
            confidence: confidence,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFact.id)
          .select()
          .single()

        factId = updatedFact.id
        console.log(`✅ Updated fact: ${subject} ${attribute} = ${value}`)
      } else {
        // Insert new fact
        const { data: newFact } = await this.supabase
          .from("facts")
          .insert({
            user_id: userId,
            category: "personal",
            subject: subject,
            attribute: attribute,
            value: value,
            confidence: confidence,
          })
          .select()
          .single()

        factId = newFact.id
        console.log(`✅ Stored new fact: ${subject} ${attribute} = ${value}`)
      }

      // Update embedding cache
      const factKey = `${subject}_${attribute}_${value}`
      const searchableText = this.createSearchableText({ subject, attribute, value })
      const embedding = await this.getEmbedding(searchableText)

      this.factEmbeddings.set(factKey, {
        fact: { id: factId, subject, attribute, value, user_id: userId },
        embedding,
        searchableText,
      })

      return { success: true, factId }
    } catch (error) {
      console.error("Error storing fact:", error)
      return { success: false, error: error.message }
    }
  }

  // 🔄 Correct existing fact
  async correctFact(attribute, newValue, userId, subject = "user") {
    try {
      console.log(`🔧 Correcting fact: ${attribute} → ${newValue}`)

      // Find the fact to correct
      const { data: factToCorrect } = await this.supabase
        .from("facts")
        .select("*")
        .eq("user_id", userId)
        .eq("subject", subject)
        .eq("attribute", attribute)
        .eq("is_active", true)
        .single()

      if (!factToCorrect) {
        console.log(`❌ No fact found to correct for ${attribute}`)
        return { success: false, message: "No fact found to correct" }
      }

      const oldValue = factToCorrect.value

      // Update the fact
      await this.supabase
        .from("facts")
        .update({
          value: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", factToCorrect.id)

      // Update embedding cache
      const oldFactKey = `${subject}_${attribute}_${oldValue}`
      const newFactKey = `${subject}_${attribute}_${newValue}`

      // Remove old embedding
      this.factEmbeddings.delete(oldFactKey)

      // Add new embedding
      const searchableText = this.createSearchableText({ subject, attribute, value: newValue })
      const embedding = await this.getEmbedding(searchableText)

      this.factEmbeddings.set(newFactKey, {
        fact: { ...factToCorrect, value: newValue },
        embedding,
        searchableText,
      })

      console.log(`✅ Corrected: ${attribute} from "${oldValue}" to "${newValue}"`)

      return {
        success: true,
        message: `Updated ${attribute} from "${oldValue}" to "${newValue}"`,
        oldValue,
        newValue,
      }
    } catch (error) {
      console.error("Error correcting fact:", error)
      return { success: false, error: error.message }
    }
  }

  // 🔍 Search facts by semantic similarity
  async searchFacts(query, userId, limit = 5) {
    try {
      const queryEmbedding = await this.getEmbedding(query)
      await this.loadFactEmbeddings(userId)

      const results = await this.findRelevantFacts(queryEmbedding, userId, limit)

      return {
        success: true,
        results: results.map((fact) => ({
          subject: fact.subject,
          attribute: fact.attribute,
          value: fact.value,
          similarity: fact.similarity,
          confidence: fact.confidence,
        })),
      }
    } catch (error) {
      console.error("Error searching facts:", error)
      return { success: false, error: error.message }
    }
  }

  // 🧠 Initialize reasoning patterns
  initializeReasoningPatterns() {
    // Define common reasoning patterns for better inference
    this.reasoningChains.set("naming_story", {
      triggers: ["why named", "name comes from", "named after"],
      factTypes: ["reason_for_naming", "name", "character"],
      confidence: 0.9,
    })

    this.reasoningChains.set("relationship_context", {
      triggers: ["who is", "tell me about"],
      factTypes: ["relationship", "description", "workplace", "school"],
      confidence: 0.8,
    })

    this.reasoningChains.set("daily_routine", {
      triggers: ["start the day", "morning routine", "breakfast"],
      factTypes: ["breakfast", "morning_drink", "routine"],
      confidence: 0.85,
    })
  }

  // 📈 Get memory statistics
  async getMemoryStats(userId) {
    try {
      const { data: facts } = await this.supabase.from("facts").select("*").eq("user_id", userId).eq("is_active", true)

      const factsBySubject = this.groupFactsBySubject(facts || [])
      const subjects = Object.keys(factsBySubject)

      return {
        totalFacts: facts?.length || 0,
        uniqueSubjects: subjects.length,
        embeddingsCached: this.factEmbeddings.size,
        averageConfidence: facts?.length > 0 ? facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length : 0,
        subjects: subjects,
      }
    } catch (error) {
      console.error("Error getting memory stats:", error)
      return { error: error.message }
    }
  }
}

module.exports = SemanticMemoryEngine
