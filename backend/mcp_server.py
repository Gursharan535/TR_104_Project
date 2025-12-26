from tavily import TavilyClient
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# --- 1. DEFINE THE TOOLS (CAPABILITIES) ---
MCP_TOOLS = [
    {
        "name": "search_web",
        "description": "Search the internet for current events, facts, or live data (e.g., stock prices, news).",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
    },
    {
        "name": "query_database",
        "description": "Search the user's past meetings for specific topics using SQL LIKE search.",
        "parameters": {"type": "object", "properties": {"keyword": {"type": "string"}}}
    }
]

# --- 2. DEFINE THE LOGIC ---
class MCPServer:
    def __init__(self):
        # Load Tavily Keys (Failover logic manually implemented here for simplicity)
        self.tavily_key = os.getenv("TAVILY_API_KEY_1")

    def search_web(self, query: str):
        print(f"[MCP] Tool Triggered: Web Search for '{query}'")
        try:
            tavily = TavilyClient(api_key=self.tavily_key)
            # Use search_depth="basic" for speed
            response = tavily.search(query=query, search_depth="basic")
            return "\n".join([f"- {r['content']} ({r['url']})" for r in response['results'][:2]])
        except Exception as e:
            return f"Search failed: {str(e)}"

    def query_database(self, keyword: str):
        print(f"[MCP] Tool Triggered: DB Search for '{keyword}'")
        try:
            # Connect to SQLite directly for speed
            conn = sqlite3.connect("./ai_workspace.db")
            cursor = conn.cursor()
            # Simple keyword search
            cursor.execute("SELECT title, date, summary FROM meeting WHERE summary LIKE ? LIMIT 3", (f'%{keyword}%',))
            rows = cursor.fetchall()
            conn.close()
            
            if not rows:
                return "No matching meetings found."
            
            return "\n".join([f"Meeting '{r[0]}' on {r[1]}: {r[2][:100]}..." for r in rows])
        except Exception as e:
            return f"Database error: {str(e)}"

    # --- 3. THE EXECUTOR ---
    def execute_tool(self, tool_name: str, args: dict):
        if tool_name == "search_web":
            return self.search_web(args.get("query"))
        elif tool_name == "query_database":
            return self.query_database(args.get("keyword"))
        else:
            return "Error: Tool not found."

# Singleton instance
mcp_instance = MCPServer()