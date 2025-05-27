const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (data) => ipcRenderer.invoke("send-message", data),
  getMemoryStats: () => ipcRenderer.invoke("get-memory-stats"),
  clearMemory: (data) => ipcRenderer.invoke("clear-memory", data),
  testBrainConnection: () => ipcRenderer.invoke("test-brain-connection"),
  getConversations: () => ipcRenderer.invoke("get-conversations"),
  logout: () => ipcRenderer.invoke("logout"),

  // Event listeners
  onUserSession: (callback) => ipcRenderer.on("user-session", callback),
  onMessageResponse: (callback) => ipcRenderer.on("message-response", callback),
  onMemoryStats: (callback) => ipcRenderer.on("memory-stats", callback),
  onMemoryCleared: (callback) => ipcRenderer.on("memory-cleared", callback),
  onBrainConnectionResult: (callback) => ipcRenderer.on("brain-connection-result", callback),
  onConversationsList: (callback) => ipcRenderer.on("conversations-list", callback),
  onLogoutSuccess: (callback) => ipcRenderer.on("logout-success", callback),
})
